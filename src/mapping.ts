import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { fetchToken } from "./helpers";
import { CHAIN_ID, CONTRACT_ADDR, GENESIS_TIMESTAMP } from "./constants";
import {
  ClaimSuccess,
  FillSuccess,
  RefundSuccess,
  Test,
  Fill_poolCall,
} from "../generated/ITO/ITO";
import {
  PoolInfo,
  BuyInfo,
  Pool,
  Seller,
  Buyer,
  Token,
  SellInfo,
} from "../generated/schema";

export function handleFillPool(call: Fill_poolCall): void {
  let txHash = call.transaction.hash.toHexString();
  let record = PoolInfo.load(txHash);

  // the event handler will be called before call handler
  // if a map record cannot be found than we skip the call
  if (!record) return;

  // create seller
  let seller_addr = call.from.toHexString();
  let seller = Seller.load(seller_addr);
  if (seller == null) {
    seller = new Seller(seller_addr);
  }
  seller.address = call.from;
  seller.name = call.inputs.name;
  seller.save();

  // create token
  let token = fetchToken(call.inputs._token_addr);
  token.save();

  // create exchange tokens
  let addrs = call.inputs._exchange_addrs as Array<Address>;
  let exchange_addrs = new Array<string>(addrs.length);
  let exchange_tokens = new Array<Token>(addrs.length);
  for (let i = 0; i < addrs.length; i += 1) {
    let token_addr_ = addrs[i] as Address;
    let token_ = fetchToken(token_addr_);
    token_.save();
    exchange_tokens[i] = token_;
    exchange_addrs[i] = token_addr_.toHexString();
  }

  // create exchange volumes
  let exchange_volumes = new Array<BigInt>(addrs.length);
  for (let i = 0; i < addrs.length; i += 1) {
    exchange_volumes[i] = BigInt.fromI32(0);
  }

  // create pool
  let pool_id = record.pid;
  let pool = new Pool(pool_id);
  pool.chain_id = CHAIN_ID;
  pool.contract_address = Bytes.fromHexString(CONTRACT_ADDR) as Address;
  pool.pid = pool_id;
  pool.password = "PASSWORD INVALID"; // a password was stored locally and kept by seller
  pool.message = call.inputs.message;
  pool.hash = call.inputs._hash.toHexString();
  pool.limit = call.inputs._limit;
  pool.total = call.inputs._total_tokens;
  pool.total_remaining = call.inputs._total_tokens;
  pool.start_time = call.inputs._start
    .plus(BigInt.fromI32(GENESIS_TIMESTAMP))
    .toI32();
  pool.end_time = call.inputs._end
    .plus(BigInt.fromI32(GENESIS_TIMESTAMP))
    .toI32();
  pool.creation_time = record.creation_time;
  pool.last_updated_time = record.creation_time;
  pool.token = token.id;
  pool.seller = seller.id;
  pool.buyers = [];
  pool.exchange_amounts = call.inputs._ratios;
  pool.exchange_volumes = exchange_volumes;
  pool.exchange_tokens = exchange_addrs;
  pool.save();

  // create sell info
  let sellInfoId =
    BigInt.fromI32(call.block.timestamp.toI32()).toHexString() +
    "_" +
    BigInt.fromI32(call.transaction.index.toI32()).toHexString();
  let sellInfo = new SellInfo(sellInfoId);
  sellInfo.pool = pool_id;
  sellInfo.seller = seller.id;
  sellInfo.timestamp = call.block.timestamp.toI32();
  sellInfo.save();
}

export function handleClaimSuccess(event: ClaimSuccess): void {
  // the pool id
  let pid = event.params.id.toHexString();

  // create token
  let token = fetchToken(event.params.token_address);
  token.save();

  // create buyer
  let buyer_addr = event.params.claimer.toHexString();
  let buyer = Buyer.load(buyer_addr);
  if (buyer == null) {
    buyer = new Buyer(buyer_addr);
  }
  buyer.address = event.params.claimer;
  buyer.name = event.params.claimer.toHexString().slice(0, 6);
  buyer.save();

  // create buy info
  let buyInfoId =
    BigInt.fromI32(event.block.timestamp.toI32()).toHexString() +
    "_" +
    BigInt.fromI32(event.transaction.index.toI32()).toHexString();
  let buyInfo = new BuyInfo(buyInfoId);
  buyInfo.pool = pid;
  buyInfo.buyer = buyer.id;
  buyInfo.timestamp = event.block.timestamp.toI32();
  buyInfo.amount = event.params.claimed_value;
  buyInfo.token = token.id;
  buyInfo.save();

  // update pool
  let pool = Pool.load(pid);
  if (pool == null) {
    return;
  }
  pool.last_updated_time = event.block.timestamp.toI32();
  pool.total_remaining = pool.total_remaining.minus(event.params.claimed_value);
  if (!pool.buyers.includes(buyer_addr)) {
    pool.buyers = pool.buyers.concat([buyer.id]);
  }
  let exchange_volumes = pool.exchange_volumes;
  let exchange_tokens = pool.exchange_tokens;
  for (let i = 0; i < exchange_tokens.length; i += 1) {
    if (exchange_tokens[i] == token.address.toHexString()) {
      exchange_volumes[i] = exchange_volumes[i].plus(buyInfo.amount);
      break;
    }
  }
  pool.exchange_volumes = exchange_volumes;
  pool.save();
}

export function handleFillSuccess(event: FillSuccess): void {
  let txHash = event.transaction.hash.toHexString();

  // the event handlers will be triggered before call handlers in the same transaction
  // this event handler only stores the necessary pool info into a map
  // the creation of the pool happens when the call handler was triggered
  let poolMap = new PoolInfo(txHash);
  poolMap.pid = event.params.id.toHexString();
  poolMap.creation_time = event.params.creation_time.toI32();
  poolMap.save();
}

export function handleRefundSuccess(event: RefundSuccess): void {
  let pid = event.params.id.toHexString();
  let pool = Pool.load(pid);
  if (pool == null) {
    return;
  }
  pool.total_remaining = BigInt.fromI32(0);
  pool.save();
}

export function handleTest(event: Test): void {}
