/*
  Copyright 2018 Set Labs Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

import Web3 from 'web3';

import { ContractWrapper } from '.';
import { Address } from '../../types/common';

/**
 * @title  AuthorizableWrapper
 * @author Set Protocol
 *
 * The AuthorizableWrapper handles all functions and states related to authorizable contracts
 *
 */
export class AuthorizableWrapper {
  private web3: Web3;
  private contracts: ContractWrapper;

  public constructor(web3: Web3) {
    this.web3 = web3;
    this.contracts = new ContractWrapper(this.web3);
  }

  /**
   * Fetches an array of authorized addresses for the autorized contract
   *
   * @param  authorizableContract Address of the contract
   * @return                      A list of authorized addresses
   */
  public async getAuthorizedAddresses(authorizableContract: Address): Promise<Address[]> {
    const authorizableInstance = await this.contracts.loadAuthorizableAsync(authorizableContract);

    return await authorizableInstance.getAuthorizedAddresses.callAsync();
  }
}
