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
import { TransactionPoolMap, Pool, Sender, Token } from "../generated/schema";

export function handleFillPool(call: Fill_poolCall): void {
  let txHash = call.transaction.hash.toHexString();
  let record = TransactionPoolMap.load(txHash);

  // the event handler will be called before call handler
  // if a map record cannot be found than we skip the call
  if (!record) return;

  // create sender
  let sender = Sender.load(call.from.toHexString());
  if (sender == null) {
    sender = new Sender(call.from.toHexString());
  }
  sender.address = call.from;
  sender.name = call.inputs.name;
  sender.message = call.inputs.message;
  sender.save();

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

  // create pool
  let pool = new Pool(record.pid);
  pool.chain_id = CHAIN_ID;
  pool.contract_address = Bytes.fromHexString(CONTRACT_ADDR) as Address;
  pool.pid = record.pid;
  pool.password = "PASSWORD INVALID"; // a password was stored locally
  pool.hash = call.inputs._hash.toHexString();
  pool.limit = call.inputs._limit;
  pool.total = call.inputs._total_tokens;
  pool.total_remaining = call.inputs._total_tokens;
  pool.sender = sender.id;
  pool.start_time = call.inputs._start.plus(BigInt.fromI32(GENESIS_TIMESTAMP));
  pool.end_time = call.inputs._end.plus(BigInt.fromI32(GENESIS_TIMESTAMP));
  pool.creation_time = record.creation_time;
  pool.token = token.id;
  pool.exchange_amounts = call.inputs._ratios;
  pool.exchange_tokens = exchange_addrs;
  pool.save();
}

export function handleClaimSuccess(event: ClaimSuccess): void {}

export function handleFillSuccess(event: FillSuccess): void {
  let txHash = event.transaction.hash.toHexString();

  // the event handlers will be triggered before call handlers for same transaction
  // we stored the necessary pool info into a temp map and create the pool
  // when call handler was triggered.
  let poolMap = new TransactionPoolMap(txHash);
  poolMap.pid = event.params.id.toHexString();
  poolMap.creation_time = event.params.creation_time;
  poolMap.save();
}

export function handleRefundSuccess(event: RefundSuccess): void {}

export function handleTest(event: Test): void {}
