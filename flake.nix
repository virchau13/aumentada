{
    description = "A Nix flake deployment tool";

    inputs = {
        utils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, utils  }: utils.lib.eachDefaultSystem (system: 
        let 
            pkgs = nixpkgs.legacyPackages."${system}";
            aumentada = pkgs.mkYarnPackage {
                pname = "aumentada";
                version = "0.1.0";
                src = ./.;
                packageJSON = ./package.json;
                yarnLock = ./yarn.lock;
                extraBuildInputs = with pkgs; [
                    cargo
                    rustc
                    nodejs
                    yarn
                ];
                buildPhase = ''
                    pushd deps/aumentada/
                    echo 'ls -al'
                    ls -al
                    yarn build
                    popd
                '';
                installPhase = ''
                    mkdir -p $out/bin
                    mv dist/ $out/dist
                    cat >$out/bin/aumentada <<EOF
#!${pkgs.bash}/bin/bash
${pkgs.nodejs}/bin/node $out/dist/index.js
EOF
                '';
            };
        in {
            defaultPackage = aumentada;
            packages.aumentada = aumentada;
            devShell = pkgs.mkShell {
                buildInputs = with pkgs; [
                    cargo
                    rustc
                    rust-analyzer
                    rustfmt
                    clippy
                    yarn
                    nodejs
                    fortune
                ];
                # for rust-analyzer, see 
                # https://discourse.nixos.org/t/rust-src-not-found-and-other-misadventures-of-developing-rust-on-nixos/11570/5
                RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
            };
        }
    );
}
