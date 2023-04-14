import { updateDeployments, deploy } from './utils/deployment'

// curve gauge contracts (stLINK, ixETH)
const gauges: any = [
  '0xd90a01c487564ba6cef5c3870c1251aff0c49e53',
  '0x9af8fbba318adeacea010b8d7c0190d443ee1a85',
]
const weeklyRewards: any = [0, 0] // weekly SDL reward amount for each gauge (stLINK, ixETH)
const updateThreshold = 86400 * 7 - 3600 // minimum amount of time between gauge reward updates (seconds)
const sdlToken = '0xA95C5ebB86E0dE73B4fB8c47A45B792CFeA28C23' // SDL token address

async function main() {
  const distributor = await deploy('SDLGaugeDistributor', [
    gauges,
    weeklyRewards,
    updateThreshold,
    sdlToken,
  ])
  console.log('SDLGaugeDistributor deployed: ', distributor.address)

  updateDeployments({
    SDLGaugeDistributor: distributor.address,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
