import { BigNumber } from 'ethers'
import { toEther, deploy, getAccounts, fromEther } from './utils/helpers'
import { assert, expect } from 'chai'
import { CurveGaugeMock, SDLToken, SDLGaugeDistributor } from '../typechain-types'
import { ethers } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('SDLGaugeDistributor', () => {
  let sdlToken: SDLToken
  let stLINKCurveGauge: CurveGaugeMock
  let ixETHCurveGauge: CurveGaugeMock
  let distributor: SDLGaugeDistributor
  let accounts: string[]

  before(async () => {
    ;({ accounts } = await getAccounts())
  })

  beforeEach(async () => {
    sdlToken = (await deploy('SDLToken', ['SDL', 'SDL', 1000000000])) as SDLToken

    stLINKCurveGauge = (await deploy('CurveGaugeMock', [sdlToken.address])) as CurveGaugeMock
    ixETHCurveGauge = (await deploy('CurveGaugeMock', [sdlToken.address])) as CurveGaugeMock

    distributor = (await deploy('SDLGaugeDistributor', [
      [stLINKCurveGauge.address, ixETHCurveGauge.address],
      [toEther(2000), toEther(1000)],
      7 * 86400 - 3600,
      sdlToken.address,
    ])) as SDLGaugeDistributor

    await sdlToken.transfer(distributor.address, toEther(10000))
  })

  it('checkUpkeep should work correctly', async () => {
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [true, '0x'])

    await distributor.performUpkeep('0x00')
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [false, '0x'])

    let blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    await time.increaseTo(blockTs + 86400 * 6)
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [false, '0x'])

    blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    await time.increaseTo(blockTs + 3600 * 23)
    assert.deepEqual(await distributor.checkUpkeep('0x00'), [true, '0x'])
  })

  it('performUpkeep should work correctly', async () => {
    await distributor.setUpdateThreshold(100)

    await distributor.performUpkeep('0x00')
    let blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    assert.equal((await distributor.lastUpdated()).toNumber(), blockTs)
    assert.equal(fromEther(await sdlToken.balanceOf(stLINKCurveGauge.address)), 2000)
    assert.equal(fromEther(await sdlToken.balanceOf(ixETHCurveGauge.address)), 1000)

    await time.setNextBlockTimestamp(blockTs + (86400 * 7) / 10)
    await distributor.performUpkeep('0x00')
    blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    assert.equal((await distributor.lastUpdated()).toNumber(), blockTs)
    assert.equal(fromEther(await sdlToken.balanceOf(stLINKCurveGauge.address)), 2200)
    assert.equal(fromEther(await sdlToken.balanceOf(ixETHCurveGauge.address)), 1100)

    await time.setNextBlockTimestamp(blockTs + 86400 * 10)
    await distributor.performUpkeep('0x00')
    blockTs = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
    assert.equal((await distributor.lastUpdated()).toNumber(), blockTs)
    assert.equal(fromEther(await sdlToken.balanceOf(stLINKCurveGauge.address)), 4200)
    assert.equal(fromEther(await sdlToken.balanceOf(ixETHCurveGauge.address)), 2100)

    expect(distributor.performUpkeep('0x00')).to.be.revertedWith('UpdateThresholdNotMet()')
  })

  it('execute should work correctly', async () => {
    await distributor.execute(
      sdlToken.address,
      (
        await ethers.getContractFactory('SDLToken')
      ).interface.encodeFunctionData('transfer', [accounts[1], toEther(100)])
    )
    assert.equal(fromEther(await sdlToken.balanceOf(distributor.address)), 9900)
    assert.equal(fromEther(await sdlToken.balanceOf(accounts[1])), 100)
  })

  it('addGauge should work correctly ', async () => {
    await distributor.addGauge(accounts[0], toEther(1))
    assert.deepEqual(await distributor.getGauges(), [
      [stLINKCurveGauge.address, BigNumber.from(toEther(2000))],
      [ixETHCurveGauge.address, BigNumber.from(toEther(1000))],
      [accounts[0], BigNumber.from(toEther(1))],
    ])
    assert.isTrue(
      (await sdlToken.allowance(distributor.address, stLINKCurveGauge.address)).eq(
        ethers.constants.MaxUint256
      )
    )
  })

  it('removeGauge should work correctly ', async () => {
    await distributor.removeGauge(0)
    assert.deepEqual(await distributor.getGauges(), [
      [ixETHCurveGauge.address, BigNumber.from(toEther(1000))],
    ])
    assert.isTrue(
      (await sdlToken.allowance(distributor.address, stLINKCurveGauge.address)).eq(
        BigNumber.from(0)
      )
    )
  })

  it('setUpdateTheshold should work correctly', async () => {
    await distributor.setUpdateThreshold(1000)
    assert.equal((await distributor.updateThreshold()).toNumber(), 1000)
  })

  it('setWeeklyRewardAmount should work correctly', async () => {
    await distributor.setWeeklyRewardAmount(1, toEther(10))
    assert.deepEqual(await distributor.getGauges(), [
      [stLINKCurveGauge.address, BigNumber.from(toEther(2000))],
      [ixETHCurveGauge.address, BigNumber.from(toEther(10))],
    ])
  })
})
