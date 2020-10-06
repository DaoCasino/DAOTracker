💎 DAO Tracker
========================

## Add fullnode url into config (blockchainUrl)

```
vim src/environments/environment.prod.ts
```

## Build and start

```
docker build -t dao-front .
docker run --rm --name dao-front -p 8080:8080 -d dao-front npm start
```

## Trustbet game event decoding

Game should provide an `explorerSpec` property at the manifest with
the following (pretty much self-explanatory) type:
```typescript
type GameSpec = {
    mappings: {[name: string]: {
        type: 'object' | 'string' | 'number'
        map: Array<any>
    }}
    transformers: Array<{
        eventName: string
        eventType: number
        length: number | { min: number, max: number }
        fields: Array<{
            name: string
            mapping?: string
            length: number | VarString
        }>
    }>
}
```

And here's an example of that:
```json
{
    "explorerSpec": {
        "mappings": {
            "card": {
                "type": "string",
                "map": [
                    "2 of Clubs",     "2 of Diamonds",     "2 of Hearts",     "2 of Spades",
                    "3 of Clubs",     "3 of Diamonds",     "3 of Hearts",     "3 of Spades",
                    "4 of Clubs",     "4 of Diamonds",     "4 of Hearts",     "4 of Spades",
                    "5 of Clubs",     "5 of Diamonds",     "5 of Hearts",     "5 of Spades",
                    "6 of Clubs",     "6 of Diamonds",     "6 of Hearts",     "6 of Spades",
                    "7 of Clubs",     "7 of Diamonds",     "7 of Hearts",     "7 of Spades",
                    "8 of Clubs",     "8 of Diamonds",     "8 of Hearts",     "8 of Spades",
                    "9 of Clubs",     "9 of Diamonds",     "9 of Hearts",     "9 of Spades",
                    "Ten of Clubs",   "Ten of Diamonds",   "Ten of Hearts",   "Ten of Spades",
                    "Jack of Clubs",  "Jack of Diamonds",  "Jack of Hearts",  "Jack of Spades",
                    "Queen of Clubs", "Queen of Diamonds", "Queen of Hearts", "Queen of Spades",
                    "King of Clubs",  "King of Diamonds",  "King of Hearts",  "King of Spades",
                    "Ace of Clubs",   "Ace of Diamonds",   "Ace of Hearts",   "Ace of Spades"
                ]
            }
        },
        "transformers": [
            {
                "eventName": "deal",
                "eventType": 6,
                "length": 3,
                "fields": [
                    { "name": "playerCards", "mapping": "card", "length": 2 },
                    { "name": "dealerCards", "mapping": "card", "length": 1 }
                ]
            },
            {
                "eventName": "split",
                "eventType": 6,
                "length": 2,
                "fields": [
                    { "name": "playerCards", "mapping": "card", "length": 2 }
                ]
            },
            {
                "eventName": "hit",
                "eventType": 6,
                "length": 1,
                "fields": [
                    { "name": "playerCards", "mapping": "card", "length": 1 }
                ]
            },
            {
                "eventName": "finish",
                "eventType": 4,
                "length": { "min": 2, "max": 10 },
                "fields": [
                    { "name": "nPlayerCards", "length": 1 },
                    { "name": "playerCards", "mapping": "card", "length": "$nPlayerCards" },
                    { "name": "nDealerCards", "length": 1 },
                    { "name": "dealerCards", "mapping": "card", "length": "$nDealerCards" }
                ]
            }
        ]
    }
}
```

Example output from this spec:
```javascript
parseWithSpec(6, { msg: [22, 2, 12] }, spec)
{
  event: 'deal',
  playerCards: [ '7 of Hearts', '2 of Hearts' ],
  dealerCards: [ '5 of Clubs' ]
}

parseWithSpec(6, { msg: [22, 12] }, spec)
{ event: 'split', playerCards: [ '7 of Hearts', '5 of Clubs' ] }

console.log(parseWithSpec(6, { msg: [22] }, spec))
{ event: 'hit', playerCards: [ '7 of Hearts' ] }

parseWithSpec(4, { msg: [1, 22, 2, 2, 3] }, spec)
{
  event: 'finish',
  nPlayerCards: 1,
  playerCards: [ '7 of Hearts' ],
  nDealerCards: 2,
  dealerCards: [ '2 of Hearts', '2 of Spades' ]
}
```
