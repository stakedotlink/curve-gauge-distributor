import { Contract } from 'ethers'
import fse from 'fs-extra'
import { ethers, network } from 'hardhat'

export const deploy = async (contractName: string, args: any[] = []) => {
  const Contract = await ethers.getContractFactory(contractName)
  const contract = await Contract.deploy(...args)
  await contract.deployed()
  return contract
}

export const getDeployments = () => {
  fse.ensureFileSync(`deployments/${network.name}.json`)
  const deployments = fse.readJSONSync(`deployments/${network.name}.json`, { throws: false })

  if (!deployments) {
    return {}
  }

  return deployments
}

export const updateDeployments = (
  newDeployments: { [key: string]: string },
  artifactMap: { [key: string]: string } = {}
) => {
  const deployments = getDeployments()

  let contractNames = Object.keys(newDeployments)
  let newDeploymentsWithArtifacts = contractNames.reduce(
    (acc, name: string) => (
      (acc[name] = { address: newDeployments[name], artifact: artifactMap[name] || name }), acc
    ),
    {} as any
  )

  fse.outputJSONSync(
    `deployments/${network.name}.json`,
    { ...deployments, ...newDeploymentsWithArtifacts },
    { spaces: 2 }
  )
}

export const getContract = async (contractName: string): Promise<Contract> => {
  const deployments = getDeployments()
  const contract = deployments[contractName]

  if (!contract) {
    throw Error('Deployed contract does not exist')
  }

  return ethers.getContractAt(contract.artifact, contract.address)
}
