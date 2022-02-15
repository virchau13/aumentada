{
    description = "A Nix flake deployment tool";

    inputs = {
        naersk.url = github:nix-community/naersk;
        utils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, utils, naersk }: utils.lib.eachDefaultSystem (system: 
        let 
            pkgs = nixpkgs.legacyPackages.${system};
            aumentada-rust = naersk.lib.${system}.buildPackage {
                root = ./.;
                copyLibs = true;
            };
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
                    mkdir -p dist/
                    echo 'ls -al'
                    ls -al
                    cp ${aumentada-rust}/lib/libaumentada.so dist/index.node
                    yarn --offline build-js
                    popd
                '';
                installPhase = ''
                    pushd deps/aumentada
                    mkdir -p $out/bin
                    mv dist/ $out/dist
                    cp -r ../../node_modules $out/dist/
                    cat >$out/bin/aumentada <<EOF
#!${pkgs.bash}/bin/bash
PATH="${pkgs.fortune}/bin:\$PATH" ${pkgs.nodejs}/bin/node $out/dist/index.js
EOF
                    popd
                    chmod +x $out/bin/aumentada
                '';
                distPhase = "true";
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
