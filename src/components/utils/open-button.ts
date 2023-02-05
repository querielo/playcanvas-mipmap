class OpenButton extends pc.ScriptType {
    public link = "https://github.com/querielo/playcanvas-mipmap";

    public initialize() {
        this.entity.button?.on("click", () => {
            window.open(this.link);
        });
    }
}

pc.registerScript(OpenButton, "openButton");

OpenButton?.attributes.add("link", {
    type: "string",
    default: "https://github.com/querielo/playcanvas-mipmap",
});
