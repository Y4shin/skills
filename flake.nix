{
  description = "Dev shell + build env for the prd-workflow plugins' bundled TypeScript tool";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        node = pkgs.nodejs_20;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            node
          ];

          shellHook = ''
            echo "prd-workflow build shell — node $(${node}/bin/node --version)"
            echo "install deps:  npm install"
            echo "build bundles + opencode overlay:  npm run build"
            echo "run tests:  npm test"
          '';
        };
      });
}
