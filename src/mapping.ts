import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  ITO,
  ClaimSuccess,
  FillSuccess,
  RefundSuccess,
  Test,
} from "../generated/ITO/ITO";
import { Pool } from "../generated/schema";

export function handleClaimSuccess(event: ClaimSuccess): void {}

export function handleFillSuccess(event: FillSuccess): void {
  log.info("The block address is {}.", [event.address.toHex()]);
}

export function handleRefundSuccess(event: RefundSuccess): void {}

export function handleTest(event: Test): void {}
