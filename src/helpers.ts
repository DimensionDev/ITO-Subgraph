import { Address } from '@graphprotocol/graph-ts'
import { MASK_CONTRACT_ADDRESS_LIST } from './constants_v1'
import { CHAIN_ID, TOKEN_TYPE_ETHER, TOKEN_TYPE_ERC20, ERC20, ERC20NameBytes, ERC20SymbolBytes } from './constants'
import { Token } from '../generated/schema'

export function isETH(chain_id: number): boolean {
  return chain_id == 1
}

export function isBSC(chain_id: number): boolean {
  return chain_id == 56
}

export function isMatic(chain_id: number): boolean {
  return chain_id == 137
}

export function isNative(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000'
}

export function isNullEthValue(value: string): boolean {
  return (
    value ==
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );
}

export function isMask(address: Address): boolean {
  for (let i = 0; i < MASK_CONTRACT_ADDRESS_LIST.length; i += 1) {
    // skip placeholder
    if (MASK_CONTRACT_ADDRESS_LIST[i] == "0x0") continue
    let address_ = Address.fromHexString(MASK_CONTRACT_ADDRESS_LIST[i])
    if (address == address_) return true
  }
  return false
}

export function fetchToken(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString())
  if (token == null) {
    token = new Token(tokenAddress.toHexString())
  }
  token.type = isNative(tokenAddress.toHex()) ? TOKEN_TYPE_ETHER : TOKEN_TYPE_ERC20
  token.chain_id = CHAIN_ID
  token.address = tokenAddress
  token.name = fetchTokenName(tokenAddress, CHAIN_ID)
  token.symbol = fetchTokenSymbol(tokenAddress, CHAIN_ID)
  token.decimals = fetchTokenDecimals(tokenAddress)
  return token as Token
}

export function fetchTokenSymbol(tokenAddress: Address, chainId: number): string {
  if (isNative(tokenAddress.toHexString())) {
    if (isBSC(chainId)) return 'BNB'
    else if (isMatic(chainId)) return 'MATIC'
    else return 'ETH'
  }

  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(tokenAddress: Address, chainId: number): string {
  if (isNative(tokenAddress.toHexString())) {
    if (isBSC(chainId)) return 'Binance'
    else if (isMatic(chainId)) return 'Polygon'
    else return 'Ether'
  }

  let contract = ERC20.bind(tokenAddress)
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString()
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenDecimals(tokenAddress: Address): i32 {
  if (isNative(tokenAddress.toHexString())) {
    return 18
  }
  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = 0
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return decimalValue
}
