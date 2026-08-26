{ pkgs, ... }:

{
  packages = [
    pkgs.nodejs_22
    pkgs.git
  ];

  env.NODE_ENV = "test";

  enterShell = ''
    if [ ! -x node_modules/.bin/vitest ] || [ ! -x node_modules/.bin/tsc ]; then
      echo "Installing locked npm dependencies..."
      npm ci
    fi
  '';
}
