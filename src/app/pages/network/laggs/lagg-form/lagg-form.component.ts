import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { GlobalState } from '../../../../global.state';
import { RestService, WebSocketService, NetworkService } from '../../../../services/';

import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';
import * as _ from 'lodash';

@Component({
  selector: 'app-lagg-form',
  template: `<entity-form [conf]="this"></entity-form>`
})
export class LaggFormComponent {

  protected resource_name: string = 'network/lagg/';
  protected route_success: string[] = ['network', 'laggs'];
  protected isEntity: boolean = true;

  protected fieldConfig: FieldConfig[] = [
    {
      type: 'input',
      name: 'lagg_interface',
      placeholder: 'Lagg Interface',
    },
    {
      type: 'select',
      name: 'lagg_protocol',
      placeholder: 'Lagg Protocol',
      options: []
    },
    {
      type: 'select',
      name: 'lagg_interfaces',
      placeholder: 'Lagg Interfaces',
      options: [],
      multiple: true
    },
  ];

  private lagg_interface: any;
  private lagg_interfaces: any;
  private lagg_protocol: any;

  constructor(protected router: Router, protected rest: RestService, protected ws: WebSocketService, protected networkService: NetworkService, protected _state: GlobalState) {

  }

  afterInit(entityForm: any) {
    this.networkService.getLaggProtocolTypes().subscribe((res) => {
      this.lagg_protocol = _.find(this.fieldConfig, {'name': 'lagg_protocol'});
      res.forEach((item) => {
        this.lagg_protocol.options.push({ label: item[1], value: item[0] });
      });
    });

    if (entityForm.isNew) {
      this.lagg_interfaces = _.find(this.fieldConfig, {'name': 'lagg_interfaces'});
      this.networkService.getLaggNicChoices().subscribe((res) => {
        res.forEach((item) => {
          this.lagg_interfaces.options.push({ label: item[1], value: item[0] });
        });
      });
    }
  }



}