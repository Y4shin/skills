{
  description = "Dev shell + build env for the prd-workflow plugin's bundled Python tool";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        python = pkgs.python313;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            python
            pkgs.uv
          ];

          # Make uv use the Nix-provided interpreter instead of downloading its
          # own — we want one reproducible Python (3.13) across machines.
          env = {
            UV_PYTHON = python.interpreter;
            UV_PYTHON_DOWNLOADS = "never";
          };

          shellHook = ''
            echo "prd-workflow build shell — python $(${python.interpreter} --version | cut -d' ' -f2), uv $(uv --version | cut -d' ' -f2)"
            echo "build the bundled artifact with:  uv run prd-tool-build"
          '';
        };
      });
}
