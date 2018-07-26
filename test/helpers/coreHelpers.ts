import * as Web3 from 'web3';

import {
  Core,
  SetTokenFactory,
  StandardTokenMock,
  TransferProxy,
  Vault,
} from 'set-protocol-contracts';
import {
  DEFAULT_GAS_PRICE,
  DEFAULT_GAS_LIMIT,
  UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
} from '../../src/constants';
import { ACCOUNTS } from '../accounts';
import { Address } from '../../src/types/common';
import { TestSet } from '../testSets';
import {
  CoreContract,
  SetTokenFactoryContract,
  StandardTokenMockContract,
  TransferProxyContract,
  VaultContract,
} from '../../src/contracts';
import { CoreAPI } from '../../src/api';
import { BigNumber } from '../../src/util';

const contract = require('truffle-contract');

const txDefaults = {
  from: ACCOUNTS[0].address,
  gasPrice: DEFAULT_GAS_PRICE,
  gas: DEFAULT_GAS_LIMIT,
};

export const deployCore = async (provider: Web3.Provider) => {
  const coreContract = contract(Core);
  coreContract.setProvider(provider);
  coreContract.defaults(txDefaults);

  // Deploy Core
  const coreInstance = await coreContract.new();

  return coreInstance.address;
};

export const deploySetTokenFactory = async (coreAddress: Address, provider: Web3.Provider) => {
  const web3 = new Web3(provider);

  const setTokenFactoryContract = contract(SetTokenFactory);
  setTokenFactoryContract.setProvider(provider);
  setTokenFactoryContract.defaults(txDefaults);

  // Deploy SetTokenFactory
  const setTokenFactoryInstance = await setTokenFactoryContract.new();
  const setTokenFactoryWrapper = await SetTokenFactoryContract.at(
    setTokenFactoryInstance.address,
    web3,
    txDefaults,
  );

  // Set Core Address
  await setTokenFactoryWrapper.setCoreAddress.sendTransactionAsync(coreAddress, txDefaults);

  // Authorize Core
  await setTokenFactoryWrapper.addAuthorizedAddress.sendTransactionAsync(coreAddress, txDefaults);

  // Enable Factory
  const coreWrapper = await CoreContract.at(coreAddress, web3, txDefaults);
  await coreWrapper.enableFactory.sendTransactionAsync(setTokenFactoryInstance.address, txDefaults);

  return setTokenFactoryInstance.address;
};

export const deployTokensForSetWithApproval = async (
  setToDeploy: TestSet,
  transferProxyAddress: Address,
  provider: Web3.Provider,
) => {
  const web3 = new Web3(provider);

  const standardTokenMockContract = contract(StandardTokenMock);
  standardTokenMockContract.setProvider(provider);
  standardTokenMockContract.defaults(txDefaults);

  // Deploy StandardTokenMocks to add to Set
  const componentAddresses: Address[] = [];
  await Promise.all(
    setToDeploy.components.map(async component => {
      const standardTokenMockInstance = await standardTokenMockContract.new(
        ACCOUNTS[0].address,
        component.supply,
        component.name,
        component.symbol,
        component.decimals,
      );
      componentAddresses.push(standardTokenMockInstance.address);

      const tokenWrapper = await StandardTokenMockContract.at(
        standardTokenMockInstance.address,
        web3,
        txDefaults,
      );
      await tokenWrapper.approve.sendTransactionAsync(
        transferProxyAddress,
        UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
        txDefaults,
      );
    }),
  );
  return componentAddresses;
};

export const approveForFill = async (
  web3: Web3,
  makerAddress: Address,
  makerToken: Address,
  relayerAddress: Address,
  relayerToken: Address,
  takerAddress: Address,
  transferProxyAddress: Address,
) => {
  let txOpts = {
    from: ACCOUNTS[0].address,
    gasPrice: DEFAULT_GAS_PRICE,
    gas: DEFAULT_GAS_LIMIT,
  };
  const makerTokenWrapper = await StandardTokenMockContract.at(
    makerToken,
    web3,
    txOpts,
  );
  const relayerTokenWrapper = await StandardTokenMockContract.at(
    relayerToken,
    web3,
    txOpts,
  );

  // Give the taker some tokens since all tokens initially
  // deployed with the makerAddress (ACCOUNTS[0])
  await relayerTokenWrapper.transferFrom.sendTransactionAsync(
    makerAddress,
    takerAddress,
    new BigNumber(10000),
    txOpts,
  );

  txOpts = {
    from: makerAddress,
    gasPrice: DEFAULT_GAS_PRICE,
    gas: DEFAULT_GAS_LIMIT,
  };
  await makerTokenWrapper.approve.sendTransactionAsync(
    transferProxyAddress,
    UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
    txOpts,
  );
  await relayerTokenWrapper.approve.sendTransactionAsync(
    transferProxyAddress,
    UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
    txOpts,
  );

  txOpts = {
    from: takerAddress,
    gasPrice: DEFAULT_GAS_PRICE,
    gas: DEFAULT_GAS_LIMIT,
  };
  await relayerTokenWrapper.approve.sendTransactionAsync(
    transferProxyAddress,
    UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
    txOpts,
  );
};

export const deployTransferProxy = async (coreAddress: Address, provider: Web3.Provider) => {
  const web3 = new Web3(provider);

  const transferProxyContract = contract(TransferProxy);
  transferProxyContract.setProvider(provider);
  transferProxyContract.defaults(txDefaults);

  // Deploy TransferProxy
  const transferProxyInstance = await transferProxyContract.new();
  const transferProxyWrapper = await TransferProxyContract.at(
    transferProxyInstance.address,
    web3,
    txDefaults,
  );

  await transferProxyWrapper.addAuthorizedAddress.sendTransactionAsync(coreAddress, txDefaults);

  return transferProxyInstance.address;
};

export const deployVault = async (coreAddress: Address, provider: Web3.Provider) => {
  const web3 = new Web3(provider);

  const vaultContract = contract(Vault);
  vaultContract.setProvider(provider);
  vaultContract.defaults(txDefaults);

  // Deploy Vault
  const vaultInstance = await vaultContract.new();
  const vaultWrapper = await VaultContract.at(vaultInstance.address, web3, txDefaults);

  await vaultWrapper.addAuthorizedAddress.sendTransactionAsync(coreAddress, txDefaults);

  return vaultInstance.address;
};

export const initializeCoreAPI = async (provider: Web3.Provider) => {
  const web3 = new Web3(provider);

  const coreAddress = await deployCore(provider);
  const transferProxyAddress = await deployTransferProxy(coreAddress, provider);
  const vaultAddress = await deployVault(coreAddress, provider);

  const coreWrapper = await CoreContract.at(coreAddress, web3, txDefaults);
  // Set Vault and TransferProxy on Core
  await coreWrapper.setVaultAddress.sendTransactionAsync(vaultAddress, txDefaults);
  await coreWrapper.setTransferProxyAddress.sendTransactionAsync(transferProxyAddress, txDefaults);

  return new CoreAPI(web3, coreAddress, transferProxyAddress, vaultAddress);
};
