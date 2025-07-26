## Getting Started

This file covers how to get started with VERT.

### Prerequisites
Make sure you have the following installed:
- [Bun](https://bun.sh/)

### Installation
```sh
# Clone the repository
$ git clone https://github.com/VERT-sh/VERT
$ cd VERT/

# Install dependencies
$ bun i
```

### Running Locally

To run the project locally, run `bun dev`.

This will start a development server. Open your browser and navigate to `http://localhost:5173` to see the application.

### Building for Production

Before building for production, make sure you create a `.env` file in the root of the project with the following content:

```sh
PUB_HOSTNAME=example.com # change to your domain, only gets used for Plausible (for now)
PUB_PLAUSIBLE_URL=https://plausible.example.com # can be empty if not using Plausible
PUB_ENV=production # "production", "development" or "nightly"
PUB_VERTD_URL=https://vertd.vert.sh # default vertd instance
```

To build the project for production, run `bun run build`.

This will build the site to the `build` folder. You should then use a web server like [nginx](https://nginx.org) to serve the files inside that folder.