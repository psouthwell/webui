import {ApplicationRef, Component, Injector, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormGroup,
  Validators
} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import * as _ from 'lodash';
import {Subscription} from 'rxjs';


import {
  IdmapService,
  IscsiService,
  RestService,
  WebSocketService
} from '../../../../services/';
import {
  FieldConfig
} from '../../../common/entity/entity-form/models/field-config.interface';
import {
  matchOtherValidator
} from '../../../common/entity/entity-form/validators/password-validation';
import { T } from '../../../../translate-marker';

@Component({
  selector : 'snmp-edit',
  template : ` <entity-form [conf]="this"></entity-form>`,
  providers : [ IscsiService, IdmapService ],
})

export class ServiceSNMPComponent {
  protected resource_name: string = 'services/snmp';
  protected addCall: string = 'snmp.update';
  protected route_success: string[] = [ 'services' ];
  public fieldConfig: FieldConfig[] = [
    {
      type : 'input',
      name : 'location',
      placeholder : T('Location'),
      tooltip: T('Optional description of the location of the system.'),
      label : 'Location',
      validation : [ Validators.required ]
    },
    {
      type : 'input',
      name : 'contact',
      placeholder : T('Contact'),
      tooltip: T('Email address of administrator.'),
      validation: [Validators.required, Validators.email]
    },
    {
      type : 'input',
      name : 'community',
      placeholder : T('Community'),
      tooltip: T('Default is <i>public</i> and <b>should be changed for\
       security reasons</b>. This can only contain alphanumeric characters,\
       underscores, dashes, periods, and spaces. This value can be left empty\
       for <i>SNMPv3</i> networks.'),
    },
    {
      type : 'checkbox',
      name : 'v3',
      placeholder : T('SNMP v3 Support'),
      tooltip: T('Check this box to enable support for SNMP version 3.'),
    },
    {
      type : 'input',
      name : 'v3_username',
      placeholder : T('Username'),
      tooltip: T('Only applies if <b>SNMP v3 Support</b> is checked.\
       Specify the username to register with this service. Refer to <a\
       href="http://net-snmp.sourceforge.net/docs/man/snmpd.conf.html"\
       target="_blank">snmpd.conf(5)</a> for more details about configuration\
       and the <b>Authentication Type</b>, <b>Password</b>,\
       <b>Privacy Protocol</b>, and <b>Privacy Passphrase</b> fields.'),
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ]
    },
    {
      type : 'select',
      name : 'v3_authtype',
      label : 'Authentic Type',
      tooltip: T('Only applies if <b>SNMP v3 Support</b> is checked.'),
      options : [
        {label : '---', value : ""}, {label : 'MD5', value : 'MD5'},
        {label : 'SHA', value : 'SHA'}
      ],
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ],
    },
    {
      type : 'input',
      name : 'v3_password',
      inputType : 'password',
      placeholder : T('password'),
      tooltip: T('Only applies if <b>SNMP v3 Support</b> is checked.\
       Specify and confirm a password of at least eight characters.'),
      validation :
          [ Validators.minLength(8), matchOtherValidator('v3_password2') ],
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ]
    },
    {
      type : 'input',
      name : 'v3_password2',
      inputType : 'password',
      placeholder : T('Confirm password'),
      tooltip: T('Re-enter <b>Password</b> to confirm.'),
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ]
    },
    {
      type : 'select',
      name : 'v3_privproto',
      label : 'Privacy Protocol',
      tooltip: T('Only applies if <b>SNMP v3 Support<b> is\
       checked.'),
      options : [
        {label : '---', value : null},
        {label : 'AES', value : 'AES'},
        {label : 'DES', value : 'DES'},
      ],
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ]
    },
    {
      type : 'input',
      name : 'v3_privpassphrase',
      inputType : 'password',
      placeholder : T('Privacy Passphrase'),
      tooltip: T('If not specified, <b>Password</b> is used.'),
      validation : [
        Validators.minLength(8), matchOtherValidator('v3_privpassphrase2')
      ],
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ]
    },
    {
      type : 'input',
      name : 'v3_privpassphrase2',
      inputType : 'password',
      placeholder : T('Confirm Privacy Passphrase'),
      tooltip: T('Re-enter <b>Privacy Passphrase</b> to confirm.'),
      relation : [ {
        action : 'DISABLE',
        when : [ {name : 'v3', value : false} ]
      } ]
    },
    {
      type : 'textarea',
      name : 'options',
      placeholder : T('Auxiliary Parameters'),
      tooltip: T('Enter any additional <a\
       href="http://net-snmp.sourceforge.net/docs/man/snmpd.conf.html"\
       target="_blank">snmpd.conf(5)</a> options, one per line.'),
    },
    {
      type : 'select',
      name : 'loglevel',
      placeholder : T('Log Level'),
      tooltip : T('Choose how many log entries to create. Choices range\
       from the least log entries (<b>Emergency</b>) to the most\
       (<b>Debug</b>).'),
      options : [
        {label : 'Emergency', value :0},
        {label : 'Alert', value :1},
        {label : 'Critical', value :2},
        {label : 'Error', value :3},
        {label : 'Warning', value :4},
        {label : 'Notice', value :5},
        {label : 'Info', value :6},
        {label : 'Debug', value :7},
      ]
    },
  ];

  ngOnInit() {}

  constructor(protected router: Router, protected route: ActivatedRoute,
              protected rest: RestService, protected ws: WebSocketService,
              protected _injector: Injector, protected _appRef: ApplicationRef,
              protected iscsiService: IscsiService,
              protected idmapService: IdmapService) {}

  afterInit(entityForm: any) {
    entityForm.ws.call('snmp.config').subscribe((res)=>{
      entityForm.formGroup.controls['location'].setValue(res.location);
      entityForm.formGroup.controls['contact'].setValue(res.contact);
      entityForm.formGroup.controls['community'].setValue(res.community);
      entityForm.formGroup.controls['v3'].setValue(res.v3);
      entityForm.formGroup.controls['v3_username'].setValue(res.v3_username);
      entityForm.formGroup.controls['v3_privproto'].setValue(res.v3_privproto);
      entityForm.formGroup.controls['options'].setValue(res.options);
      entityForm.formGroup.controls['loglevel'].setValue(res.loglevel);
      entityForm.formGroup.controls['v3_password'].setValue(res.v3_password);
      entityForm.formGroup.controls['v3_password2'].setValue(res.v3_password);
      entityForm.formGroup.controls['v3_privpassphrase'].setValue(res.v3_privpassphrase);
      entityForm.formGroup.controls['v3_privpassphrase2'].setValue(res.v3_privpassphrase);
      entityForm.formGroup.controls['v3_authtype'].setValue(res.v3_authtype);
    });
    entityForm.submitFunction = this.submitFunction;
   }

  clean(value) {
    delete value['v3_privpassphrase2'];
    delete value['v3_password2'];
    if (!value['v3']){
      value['v3_password'] = "";
      value['v3_privpassphrase'] = "";
      value['v3_privproto'] = null;
      value['v3_authtype'] = "";


    }

    return value;
  }

  submitFunction(this: any, entityForm: any,){

    return this.ws.call('snmp.update', [entityForm]);

  }
}
