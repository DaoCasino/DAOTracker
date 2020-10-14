import { Component, OnChanges, Input } from '@angular/core';
import { EosService } from '../../services/eos.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vote-progress-bar',
  templateUrl: './vote-progress-bar.component.html',
  styleUrls: ['./vote-progress-bar.component.scss']
})
export class VoteProgressBarComponent implements OnChanges {

  @Input() chainStatus;
  chainPercentage;
  chainNumber;

  constructor(private eos: EosService) {}

  async ngOnChanges() {
    if (this.chainStatus) {
      const currStats = await this.eos.api.rpc.get_currency_stats('eosio.token', environment.token)
      const supply = Number(currStats[environment.token]?.supply?.split(' ')[0])
      if (!supply) return

      console.log(supply)
      this.chainNumber = (this.chainStatus.total_activated_stake / 10000);
      this.chainPercentage = (this.chainNumber / supply * 100).toFixed(2);
    }
  }

}
