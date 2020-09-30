import { Injectable } from '@angular/core'
import { Serialize } from 'eosjs'
import { TextEncoder, TextDecoder } from 'text-encoding'
import { environment } from '../../environments/environment';
import { GAME_FAILED, GAME_FINISHED, GAME_MESSAGE, GAME_STARTED } from './eos.abi'
import { EosService } from './eos.service'
import { LoggerService } from './logger.service'

export enum PlatformEventType {
    GameStarted = 0,
    GameFinished = 4,
    GameFailed = 5,
    GameMessage = 6,
}

export const GameEventTypeMap = {
    [PlatformEventType.GameStarted]: 'Game started',
    [PlatformEventType.GameFinished]: 'Game finished',
    [PlatformEventType.GameFailed]: 'Game failed',
    [PlatformEventType.GameMessage]: 'Game message',
}

type ParseState = Record<string, any>
type VarLength = number | { min: number, max: number }
type VarString = string
type MappingType = 'object' | 'string' | 'number'
interface MappingTypeMap {
    object: object
    string: string
    number: number
}
interface GameMapping {
    type: MappingType
    map: Array<MappingTypeMap[this['type']]>
}
interface TransformerField {
    name: string
    mapping?: string
    length: number | VarString
}
interface GameTransformer {
    eventName: string
    eventType: number
    length: VarLength
    fields: Array<TransformerField>
}
type GameSpec = {
    mappings: Record<string, GameMapping>
    transformers: Array<GameTransformer>
}
interface GamePayload {
    player_win_amount?: string
    msg: number[]
}

export interface PlatformEventPayload {
    sender: string
    casino_id: number
    event_type: number
    game_id: number
    req_id: number
    data: string
}

@Injectable({ providedIn: 'root' })
export class GameDecoderService {
    private eventAbis = new Map<PlatformEventType, Map<string, Serialize.Type>>()
    private builtinTypes = Serialize.createInitialTypes()
    private abiMap = {
        [PlatformEventType.GameStarted]: GAME_STARTED,
        [PlatformEventType.GameFinished]: GAME_FINISHED,
        [PlatformEventType.GameFailed]: GAME_FAILED,
        [PlatformEventType.GameMessage]: GAME_MESSAGE,
    }

    constructor(
        private eos: EosService,
        private logger: LoggerService
    ) {
        for (const [etype, abi] of Object.entries(this.abiMap)) {
            this.eventAbis.set(Number(etype), Serialize.getTypesFromAbi(this.builtinTypes, abi))
        }
    }

    private readMsg(msg: string) {
        const buf = Buffer.from(msg, 'hex')
        const len = buf.readUInt8(0)
        const data: number[] = []
        for (let i = 0; i < len; i++) data.push(buf.readUInt32LE(1 + i * 8))
        return data
    }

    public deserializeEvent(payload: PlatformEventPayload) {
        const textEncoder = new TextEncoder()
        const textDecoder = new TextDecoder()
        const eventType = this.eventAbis.get(payload.event_type)?.get('event_data')
        if (!eventType) throw new Error('Unknown event type')
        const buffer = new Serialize.SerialBuffer({
            textEncoder,
            textDecoder,
            array: Serialize.hexToUint8Array(payload.data),
        })
        const data = eventType.deserialize(buffer)
        if (data.msg) data.msg = this.readMsg(data.msg)
        return data
    }

    public async casinoById(id: number) {
        const result = await this.eos.api.rpc.get_table_rows({
            limit: 1,
            json: true,
            lower_bound: id,
            table_key: 'id',
            table: 'casino',
            code: environment.platformAcc,
            scope: environment.platformAcc,
        })
        return result?.rows[0]
    }

    public async gameById(id: number) {
        const result = await this.eos.api.rpc.get_table_rows({
            limit: 1,
            json: true,
            lower_bound: id,
            table_key: 'id',
            table: 'game',
            code: environment.platformAcc,
            scope: environment.platformAcc,
        })
        const game = result?.rows[0]
        if (game?.meta) {
            const meta = Buffer.from(game.meta, 'hex')
            game.meta = JSON.parse(meta.toString())
            if (game.meta.manifestURL) {
                const manifest = await fetch(game.meta.manifestURL + '/manifest.json')
                const manifestJSON = await manifest.json()
                game.meta.manifest = manifestJSON
            }
        }
        return result?.rows[0]
    }

    public async gameParamsById(casino: string, id: number) {
        const result = await this.eos.api.rpc.get_table_rows({
            limit: 1,
            json: true,
            lower_bound: id,
            table_key: 'game_id',
            table: 'game',
            code: casino,
            scope: casino,
        })
        return result?.rows[0]?.params
    }

    public async playerFromTxid(txid: string) {
        const tx = await this.eos.api.rpc.history_get_transaction(txid)
        // const traces = tx.traces.filter(t => !!t.act.data?.event_type)
        // if (traces.length) console.dir(traces, { depth: 6 })
        return tx.traces[0]?.act?.data?.from
    }

    public parseWithSpec(event: number, data: GamePayload, spec: GameSpec): ParseState {
        const isVarString = (x: any): x is VarString => typeof x === 'string' && x.startsWith('$')
        const parseVariable = <T = any>(state: ParseState, v: any): T => (isVarString(v) ? state[v.substr(1)] : v) as T
        const checkLength = (arr: any[], constraint: VarLength): boolean => {
            if (typeof constraint === 'number') return arr.length === constraint
            return arr.length >= constraint.min && arr.length <= constraint.max
        }
        const state: ParseState = {}
        const transformer = spec.transformers.find(t => event === t.eventType && checkLength(data.msg, t.length))
        if (!transformer) throw new Error('Transformer not found')
        state.event = transformer.eventName
        let offset = 0
        for (let field of transformer.fields) {
            if (isVarString(field.length)) field.length = parseVariable<number>(state, field.length)
            const slice = data.msg.slice(offset, offset + field.length)
            state[field.name] = field.mapping
                ? slice.map(i => spec.mappings[field.mapping].map[i])
                : field.length > 1 ? slice : slice[0]
            offset += field.length
        }
        return state
    }
}
