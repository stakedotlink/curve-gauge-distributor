import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'

export const toEther = (amount: string | number) => {
  return ethers.utils.parseEther(amount.toString()).toHexString()
}

export const fromEther = (amount: BigNumber) => {
  return Number(ethers.utils.formatEther(amount))
}

export const deploy = async (contractName: string, args: any[] = []) => {
  const Contract = await ethers.getContractFactory(contractName)
  return Contract.deploy(...args)
}

export const getAccounts = async () => {
  const signers = await ethers.getSigners()
  const accounts = await Promise.all(signers.map(async (signer) => signer.getAddress()))
  return { signers, accounts }
}
