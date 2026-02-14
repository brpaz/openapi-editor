{ pkgs, lib, ... }:

{
  languages.rust = {
    enable = true;
    channel = "stable";
    targets = [ "wasm32-unknown-unknown" ];
  };

  languages.javascript = {
    enable = true;
    pnpm = {
      enable = true;
    };
  };

  packages = with pkgs; [
    cargo-tauri
    pkg-config
    openssl
    webkitgtk_4_1
    gtk3
    libsoup_3
    glib
    glib-networking
    dbus
    librsvg
    libayatana-appindicator
    libcanberra-gtk3
    curl
    wget
    at-spi2-atk
    atkmm
    cairo
    gdk-pixbuf
    harfbuzz
    pango
    mesa
  ];

  env = {
    # PKG_CONFIG_PATH for Rust build scripts
    PKG_CONFIG_PATH = lib.concatStringsSep ":" [
      "${pkgs.webkitgtk_4_1.dev}/lib/pkgconfig"
      "${pkgs.gtk3.dev}/lib/pkgconfig"
      "${pkgs.libsoup_3.dev}/lib/pkgconfig"
      "${pkgs.glib.dev}/lib/pkgconfig"
      "${pkgs.cairo.dev}/lib/pkgconfig"
      "${pkgs.pango.dev}/lib/pkgconfig"
      "${pkgs.gdk-pixbuf.dev}/lib/pkgconfig"
      "${pkgs.harfbuzz.dev}/lib/pkgconfig"
      "${pkgs.dbus.dev}/lib/pkgconfig"
      "${pkgs.openssl.dev}/lib/pkgconfig"
    ];
  };

  enterShell = ''
    # Runtime libraries for GTK/WebKit (only after shell enters)
    export LD_LIBRARY_PATH="${lib.concatStringsSep ":" [
      (lib.makeLibraryPath (with pkgs; [
        webkitgtk_4_1
        gtk3
        libsoup_3
        glib
        glib-networking
        dbus
        openssl
        librsvg
        libayatana-appindicator
        cairo
        gdk-pixbuf
        harfbuzz
        pango
        mesa
        libglvnd
        vulkan-loader
      ]))
      "/usr/lib64"
    ]}"
    export GIO_MODULE_PATH="${pkgs.glib-networking}/lib/gio/modules"
    export GTK_PATH="${pkgs.libcanberra-gtk3}/lib/gtk-3.0"
    export WEBKIT_DISABLE_DMABUF_RENDERER=1
  '';
}
