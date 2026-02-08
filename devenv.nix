{ pkgs, lib, ... }:

{
  languages.rust = {
    enable = true;
    channel = "stable";
    targets = [ "wasm32-unknown-unknown" ];
  };

  languages.javascript = {
    enable = true;
    npm.enable = true;
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
    LD_LIBRARY_PATH = lib.concatStringsSep ":" [
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
    ];
    GIO_MODULE_PATH = "${pkgs.glib-networking}/lib/gio/modules";
    GTK_PATH = "${pkgs.libcanberra-gtk3}/lib/gtk-3.0";
    WEBKIT_DISABLE_DMABUF_RENDERER = "1";
  };

  git-hooks.hooks = {
    eslint.enable = false;
    clippy.enable = false;
  };
}
