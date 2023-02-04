class Mipmap extends pc.ScriptType {
    private isActive = false;

    private materials = new Map<pc.StandardMaterial, [pc.Texture, pc.Texture]>();
    private processingMaterials = new Set<pc.StandardMaterial>();

    public initialize() {
        const material = this.entity.render?.material || this.entity.model?.material;
        if (material instanceof pc.StandardMaterial) {
            this.processingMaterials.add(material);
        }

        const camera = this.entity.camera;
        if (camera) {
            // change diffuse texture for all materials on camera layers
            for (const layerId of camera.layers) {
                const layer = this.app.scene.layers.getLayerById(layerId);

                if (!layer) {
                    continue;
                }

                // walk through all opaque mesh instances on layer and add them to the processing list
                for (const meshInstance of layer.opaqueMeshInstances) {
                    if (meshInstance.material instanceof pc.StandardMaterial) {
                        this.processingMaterials.add(meshInstance.material);
                    }
                }

                // walk through all transparent mesh instances on layer and add them to the processing list
                for (const meshInstance of layer.transparentMeshInstances) {
                    if (meshInstance.material instanceof pc.StandardMaterial) {
                        this.processingMaterials.add(meshInstance.material);
                    }
                }

                const addMeshInstances = layer.addMeshInstances.bind(layer);
                layer.addMeshInstances = (meshInstances: pc.MeshInstance[], skipShadowCasters?: boolean) => {
                    for (const meshInstance of meshInstances) {
                        if (meshInstance.material instanceof pc.StandardMaterial) {
                            this.processingMaterials.add(meshInstance.material);
                        }
                    }

                    addMeshInstances(meshInstances, skipShadowCasters);
                };

                const removeMeshInstances = layer.removeMeshInstances.bind(layer);

                layer.removeMeshInstances = (meshInstances: pc.MeshInstance[], skipShadowCasters?: boolean) => {
                    for (const meshInstance of meshInstances) {
                        if (meshInstance.material instanceof pc.StandardMaterial) {
                            this.processingMaterials.delete(meshInstance.material);
                        }
                    }

                    removeMeshInstances(meshInstances, skipShadowCasters);
                };
            }
        }
    }

    public update(dt: number): void {
        this.processMaterials();

        const isActive = this.app.keyboard.isPressed(pc.KEY_B);

        if (this.isActive !== isActive) {
            this.isActive = isActive;

            for (const [material, [oldDiffuseTexture, newDiffuseTexture]] of this.materials.entries()) {
                material.diffuseMap = this.isActive ? newDiffuseTexture : oldDiffuseTexture;
                material.update();
            }
        }
    }

    private processMaterials() {
        for (const material of this.processingMaterials) {
            if (
                !material.diffuseMap ||
                material.diffuseMap.name === "placeholder" ||
                material.diffuseMap.name === "material_placeholder"
            ) {
                continue;
            }

            if (!material.diffuseMap.name.startsWith("mipmap-")) {
                const oldDiffuseTexture = material.diffuseMap;

                const width = oldDiffuseTexture.width;
                const height = oldDiffuseTexture.height;

                const newDiffuseTexture = this.generateMipmapTexture(width, height);

                this.materials.set(material, [oldDiffuseTexture, newDiffuseTexture]);
            }

            this.processingMaterials.delete(material);
        }
    }

    private generateMipmapTexture = (() => {
        const memo = new Map<string, pc.Texture>();

        const colors = [
            [255, 0, 0], // Red
            [255, 165, 0], // Orange
            [255, 255, 0], // Yellow
            [0, 128, 0], // Green
            [0, 0, 255], // Blue
            [75, 0, 130], // Indigo
            [238, 130, 238], // Violet
            [0, 0, 0], // Black
            [255, 255, 255], // White
            [255, 192, 203], // Pink
            [165, 42, 42], // Brown
            [128, 128, 128], // Gray
            [128, 0, 128], // Purple
            [0, 128, 128], // Teal
        ];

        return (width: number, height: number) => {
            const key = `${width}-${height}`;
            if (memo.get(key)) {
                return memo.get(key) as pc.Texture;
            }

            const device = this.app.graphicsDevice;

            const levels = [];

            for (var i = 0; i < Math.log2(Math.max(width, height)); i++) {
                const levelWidth = width >> i;
                const levelHeight = height >> i;

                const data = new Uint8Array(levelWidth * levelHeight * 3);
                levels.push(data);

                const color = colors[i % colors.length];

                for (var j = 0; j < levelWidth * levelHeight; j++) {
                    data[j * 3 + 0] = color[0];
                    data[j * 3 + 1] = color[1];
                    data[j * 3 + 2] = color[2];
                }
            }

            const mipmapTex = new pc.Texture(device, {
                name: `mipmap-${key}`,
                format: pc.PIXELFORMAT_R8_G8_B8,
                minFilter: pc.FILTER_LINEAR_MIPMAP_NEAREST,
                width: width,
                height: height,
                mipmaps: true,
                levels: levels,
            });

            memo.set(key, mipmapTex);

            return mipmapTex;
        };
    })();
}

pc.registerScript(Mipmap, "mipmap");
