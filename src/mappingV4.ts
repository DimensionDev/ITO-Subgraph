import { BigInt, Address } from '@graphprotocol/graph-ts'
import { fetchToken } from './helpers'
import { CHAIN_ID } from './constants'
import { GENESIS_TIMESTAMP } from './constants_v2'
import { FillSuccess, DestructSuccess, SwapSuccess, Fill_poolCall, SwapCall } from '../generated/ITO_V4/ITO_V4'
import { PoolInfo, BuyInfo, DestructInfo, Pool, Seller, Buyer, Token, SellInfo } from '../generated/schema'

export function handleFillSuccess(event: FillSuccess): void {
  let txHash = event.transaction.hash.toHexString()
  let poolMap = new PoolInfo(txHash)

  // create seller
  let seller_addr = event.transaction.from.toHexString()
  let seller = Seller.load(seller_addr)
  if (seller == null) {
    seller = new Seller(seller_addr)
  }
  seller.address = event.transaction.from
  seller.name = seller_addr
  seller.save()  

  // create token
  let token = fetchToken(event.params.token_address)
  token.save()  

  // create exchange tokens
  let addrs = event.params.exchange_addrs as Array<Address>
  let exchange_addrs = new Array<string>(addrs.length)
  let exchange_tokens = new Array<Token>(addrs.length)
  for (let i = 0; i < addrs.length; i += 1) {
    let token_addr_ = addrs[i] as Address
    let token_ = fetchToken(token_addr_)
    token_.save()
    exchange_tokens[i] = token_
    exchange_addrs[i] = token_addr_.toHexString()
  }

  // create exchange volumes
  let exchange_in_volumes = new Array<BigInt>(addrs.length)
  let exchange_out_volumes = new Array<BigInt>(addrs.length)
  for (let i = 0; i < addrs.length; i += 1) {
    exchange_in_volumes[i] = BigInt.fromI32(0)
    exchange_out_volumes[i] = BigInt.fromI32(0)
  }  

  poolMap.pid = event.params.id.toHexString()
  poolMap.creation_time = event.params.creation_time.toI32()

  poolMap.save()

  // create pool
  let pool_id = poolMap.pid
  let pool = new Pool(pool_id)  

  pool.is_mask = false
  pool.chain_id = CHAIN_ID
  pool.contract_address = event.transaction.to!
  pool.qualification_address = event.params.qualification
  pool.pid = pool_id
  pool.password = '' // a password was stored locally and kept by seller
  pool.message = event.params.message
  pool.limit = event.params.limit
  pool.total = event.params.total
  pool.total_remaining = event.params.total
  pool.start_time = event.params.start.plus(BigInt.fromI32(GENESIS_TIMESTAMP)).toI32()
  pool.end_time = event.params.end.plus(BigInt.fromI32(GENESIS_TIMESTAMP)).toI32()
  pool.creation_time = poolMap.creation_time  
  pool.last_updated_time = poolMap.creation_time
  pool.token = token.id
  pool.seller = seller.id
  pool.buyers = []
  pool.exchange_amounts = event.params.ratios
  pool.exchange_in_volumes = exchange_in_volumes
  pool.exchange_out_volumes = exchange_out_volumes
  pool.exchange_tokens = exchange_addrs
  pool.save()

  // create sell info
  let sellInfoId =
    BigInt.fromI32(event.block.timestamp.toI32()).toHexString() +
    '_' +
    BigInt.fromI32(event.transaction.index.toI32()).toHexString()
  let sellInfo = new SellInfo(sellInfoId)
  sellInfo.pool = pool_id
  sellInfo.seller = seller.id
  sellInfo.amount = event.params.total
  sellInfo.timestamp = event.block.timestamp.toI32()
  sellInfo.token = token.id
  sellInfo.save()  
}

export function handleSwapSuccess(event: SwapSuccess): void {
  // the pool id
  let pool_id = event.params.id.toHexString()

  // create token
  let token = fetchToken(event.params.from_address)
  token.save()

  // create buyer
  let buyer_addr = event.params.swapper.toHexString()
  let buyer = Buyer.load(buyer_addr)
  if (buyer == null) {
    buyer = new Buyer(buyer_addr)
  }
  buyer.address = event.params.swapper
  buyer.name = event.params.swapper.toHexString()
  buyer.save()

  // create buy info
  let buyInfoId =
    BigInt.fromI32(event.block.timestamp.toI32()).toHexString() +
    '_' +
    BigInt.fromI32(event.transaction.index.toI32()).toHexString()
  let buyInfo = new BuyInfo(buyInfoId)
  buyInfo.pool = pool_id
  buyInfo.buyer = buyer.id
  buyInfo.timestamp = event.block.timestamp.toI32()
  // the amount will be updated in handleSwapPool
  buyInfo.amount = event.params.input_total
  buyInfo.amount_sold = event.params.from_value
  buyInfo.amount_bought = event.params.to_value
  buyInfo.token = token.id
  buyInfo.save()
  // update pool
  let pool = Pool.load(pool_id);
  if (pool == null) return;
  pool.last_updated_time = event.block.timestamp.toI32();
  pool.total_remaining = pool.total_remaining.minus(event.params.to_value);
  if (!pool.buyers.includes(buyer.id)) {
    pool.buyers = pool.buyers.concat([buyer.id]);
  }
  let exchange_in_volumes = pool.exchange_in_volumes
  let exchange_out_volumes = pool.exchange_out_volumes
  let exchange_tokens = pool.exchange_tokens
  for (let i = 0; i < exchange_tokens.length; i += 1) {
    if (exchange_tokens[i] == token.address.toHexString()) {
      exchange_in_volumes[i] = exchange_in_volumes[i].plus(event.params.from_value)
      exchange_out_volumes[i] = exchange_out_volumes[i].plus(event.params.to_value)
      break
    }
  }
  pool.exchange_in_volumes = exchange_in_volumes
  pool.exchange_out_volumes = exchange_out_volumes
  pool.save()
}

export function handleDestructSuccess(event: DestructSuccess): void {
  let pid = event.params.id.toHexString()
  let pool = Pool.load(pid)
  if (pool == null) return
  pool.total_remaining = BigInt.fromI32(0)
  pool.save()

  // create token info
  let token_addr = event.params.token_address.toHexString()
  let token = Token.load(token_addr)
  if (token == null) return

  // create seller info
  let seller_addr = event.transaction.from.toHexString()
  let seller = Seller.load(seller_addr)
  if (seller == null) return

  // create destruct info
  let destructInfoId =
    BigInt.fromI32(event.block.timestamp.toI32()).toHexString() +
    '_' +
    BigInt.fromI32(event.transaction.index.toI32()).toHexString()
  let destructInfo = new DestructInfo(destructInfoId)
  destructInfo.pool = pool.id
  destructInfo.seller = seller.id
  destructInfo.token = token.id
  destructInfo.amount = event.params.remaining_balance
  destructInfo.timestamp = event.block.timestamp.toI32()
  destructInfo.save()
}

export function handleFillPool(call: Fill_poolCall): void {}

export function handleSwapPool(call: SwapCall): void {}
