import { toEther, deploy, getAccounts, fromEther } from './utils/helpers'
import { assert, expect } from 'chai'
import {
  CurveGaugeMock,
  StakingPoolMock,
  WrappedSDToken,
  LSTGaugeDistributor,
  ERC677,
} from '../typechain-types'
import { ethers } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('LSTGaugeDistributor', () => {
  let token: ERC677
  let wrappedToken: WrappedSDToken
  let stakingPool: StakingPoolMock
  let curveGauge: CurveGaugeMock
  let distributor: LSTGaugeDistributor
  let accounts: string[]

  before(async () => {
    ;({ accounts } = await getAccounts())
  })

  beforeEach(async () => {
    token = (await deploy('ERC677', ['TKN', 'TKN', 1000000000])) as ERC677

    stakingPool = (await deploy('StakingPoolMock', [token.address, 2])) as StakingPoolMock

    wrappedToken = (await deploy('WrappedSDToken', [
      stakingPool.address,
      'test',
      'test',
    ])) as WrappedSDToken

    curveGauge = (await deploy('CurveGaugeMock', [wrappedToken.address])) as CurveGaugeMock

    distributor = (await deploy('LSTGaugeDistributor', [
      stakingPool.address,
      wrappedToken.address,
      curveGauge.address,
      86400 * 7,
      0,
    ])) as LSTGaugeDistributor

    await token.approve(stakingPool.address, ethers.constants.MaxUint256)
    await stakingPool.deposit(toEther(1000))
  })

  it('checkUpkeep should work correctly', async () => {
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [false, '0x'])

    await stakingPool.transfer(distributor.address, toEther(100))
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [true, '0x'])

    await distributor.performUpkeep('0x00')
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [false, '0x'])

    await stakingPool.transfer(distributor.address, toEther(100))
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [false, '0x'])

    await time.increase(7 * 86400)
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [true, '0x'])
  })

  it('performUpkeep should work correctly', async () => {
    await stakingPool.transfer(distributor.address, toEther(100))
    await distributor.performUpkeep('0x00')
    let blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    assert.equal((await distributor.lastUpdated()).toNumber(), blockTs)
    assert.equal(fromEther(await wrappedToken.balanceOf(curveGauge.address)), 50)

    await stakingPool.transfer(distributor.address, toEther(50))
    expect(distributor.performUpkeep('0x00')).to.be.revertedWith('UpdateConditionsNotMet()')

    await time.increase(7 * 86400)
    await distributor.performUpkeep('0x00')
    blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    assert.equal((await distributor.lastUpdated()).toNumber(), blockTs)
    assert.equal(fromEther(await wrappedToken.balanceOf(curveGauge.address)), 75)

    await time.increase(7 * 86400)
    await stakingPool.transfer(distributor.address, toEther(50))
    expect(distributor.performUpkeep('0x00')).to.be.revertedWith('UpdateConditionsNotMet()')
  })

  it('execute should work correctly', async () => {
    await token.transfer(distributor.address, toEther(1000))
    await distributor.execute(
      token.address,
      (
        await ethers.getContractFactory('ERC677')
      ).interface.encodeFunctionData('transfer', [accounts[1], toEther(100)])
    )
    assert.equal(fromEther(await token.balanceOf(distributor.address)), 900)
    assert.equal(fromEther(await token.balanceOf(accounts[1])), 100)
  })

  it('onTokenTransfer should work correctly', async () => {
    await expect(distributor.onTokenTransfer(accounts[0], toEther(1000), '0x')).to.be.revertedWith(
      'SenderNotAuthorized()'
    )

    await stakingPool.transferAndCall(distributor.address, toEther(200), '0x')
    assert.equal(fromEther(await stakingPool.balanceOf(distributor.address)), 200)
  })

  it('setUpdateTheshold should work correctly', async () => {
    await distributor.setUpdateThreshold(1000)
    assert.equal((await distributor.updateThreshold()).toNumber(), 1000)
  })
})
