{
  description = "Dev shell + build env for the task-workflow TypeScript tools";

  inputs = {
    nixpkgs.url = "github:Nixpkgs/nixos-unstable";
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
            echo "task-workflow dev shell — node $(${node}/bin/node --version)"
            echo "install deps:  npm install"
            echo "run tests:  npm test"
          '';
        };
      });
}
