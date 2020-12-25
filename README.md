# ITO Subgraph

This subgraph tracks all of ITO pools create by the ITO contract.

## Setup

```bash
yarn
yarn codegen
yarn build
```

## Running Locally

Make sure to update package.json settings to point to your own graph account.

## Key Entity Overviews

### Pool

Cotains data about an ITO pool.

### Token

Contains detailed data on a specific token.

### Seller

Cotains data about the creator of an ITO pool.

### Buyer

Cotains data about the consumer of an ITO pool.
