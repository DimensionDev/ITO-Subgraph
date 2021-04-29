import fs from 'fs'
import mainnetJson from './config/mainnet.json'
import ropstenJson from './config/ropsten.json'
import bscChapelJson from './config/bsc-chapel.json'
import abiV1Json from './config/abi_v1.json'
import abiV2Json from './config/abi_v2.json'
import { constantsTmplV1, constantsTmplV2 } from './templates/constants'
import { subgraphYamlTmpl } from './templates/subgraph'
import mustache from 'mustache'

type CONFIG = {
  chainId: number
  network: string
  mask_to: string
  contracts: {
    address: string
    startBlock: number
    abi: string
    mapping: string
  }[]
}

type GRAPH_HANDLER = {
  entities: { event: string }[]
  callHandlers: { function: string; handler: string }[]
  eventHandlers: { event: string; handler: string }[]
}

const graphHandlers: Readonly<Record<string, GRAPH_HANDLER>> = {
  ITO_V1: abiV1Json,  
  ITO_V2: abiV2Json,
}

const constantsTmpls = [
  { filename: 'constants_v1.ts', tmpl: constantsTmplV1 },  
  { filename: 'constants_v2.ts', tmpl: constantsTmplV2 }
]

function generate(config: CONFIG) {
  config.contracts = config.contracts.map(contract => ({ ...contract, ...graphHandlers[contract.abi] }))

  const yamlFile = mustache.render(subgraphYamlTmpl, config)

  fs.writeFileSync(`./subgraph.yaml`, yamlFile)

  constantsTmpls.map(constantsTmpl => {
    const constantsFile = mustache.render(constantsTmpl.tmpl, config)
    fs.writeFileSync(`./src/${constantsTmpl.filename}`, constantsFile)
  })
}

const configs = {
  'ropsten': ropstenJson,
  'mainnet': mainnetJson,
  'bsc-chapel': bscChapelJson,
}

const network = process.env.NETWORK as (keyof typeof configs)

if (network) generate(configs[network] as CONFIG)
