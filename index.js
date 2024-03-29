const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { getModule } = require('powercord/webpack');
const { ContextMenu } = require('powercord/components');

const Settings = require('./Settings.jsx');
const Providers = require('./providers.json');

const ContextMenus = [
    'MessageContextMenu',
    'GuildContextMenu',
    'GuildChannelUserContextMenu',
    'GuildUserContextMenu',
    'NativeImageContextMenu',
];

module.exports = class ReverseImageSearch extends Plugin {
    toSnake(str) {
        return str.split(' ').join('-').toLowerCase();
    }

    open(uri, target) {
        let encoded = uri.replace(
            '%%',
            encodeURI(target.parentElement.href || target.src)
        );
        if (this.settings.get(`RIS-convertPNG`, false)) {
            encoded = encoded.replace('.webp', '.png');
        }
        if (this.settings.get(`RIS-enlargeImages`, false)) {
            encoded = encoded.replace('size=32', 'size=512');
        }
        return window.open(encoded, '_blank');
    }

    createMenuButton(name, id, callback) {
        return {
            type: 'button',
            name,
            id: `reverse-image-search-${id}`,
            onClick: callback,
        };
    }

    createReverseImageSearch(props, res) {
        const providers = Providers.filter(i =>
            this.settings.get(`RIS-provider-${this.toSnake(i.name)}`, i.default)
        );

        // Recursively select target image
        let target = props[0]?.target;

        // Return when clicked on table
        if (['TD', 'TR', 'TABLE', 'SPAN'].includes(target.tagName)) return res;

        while (target?.children?.tagName !== 'img') {
            if (target?.children && target?.children[0])
                target = target.children[0];
            else break;
        }

        // If target isn't an image, return
        if (target.tagName.toLowerCase() !== 'img') return res;

        // Recursively select children property
        let children = res?.props?.children;
        while (typeof children !== 'array' && children?.props?.children) {
            if (children?.props?.children) children = children.props.children;
            else break;
        }

        // Display (One provider selected)
        if (providers.length === 1) {
            children.push(
                ...ContextMenu.renderRawItems([
                    this.createMenuButton('Reverse Image Search', 'menu', () =>
                        this.open(providers[0].domain, target)
                    ),
                ])
            );
        } else if (providers.length > 1) {
            // Display (Multiple providers selected)
            const providersSubmenu = providers.map((i, index) =>
                this.createMenuButton(i.name, index, () =>
                    this.open(i.domain, target)
                )
            );

            // Add "All" button if enabled in settings
            if (this.settings.get('RIS-openAll'))
                providersSubmenu.unshift(
                    this.createMenuButton('All', 'all', () =>
                        providers.forEach(i => this.open(i.domain, target))
                    )
                );

            // Push submenu to context menu
            children.push(
                ...ContextMenu.renderRawItems([
                    {
                        type: 'submenu',
                        name: 'Reverse Image Search',
                        id: 'reverse-image-search-submenu',
                        getItems: () => providersSubmenu,
                    },
                ])
            );
        }

        return res;
    }

    // Credit to SammCheese:
    // https://github.com/SammCheese/holy-notes/blob/e9157324c3d210f1f177c14c6f08ab0580b62dad/index.js#L70
    async lazyPatchContextMenu(displayName, patch) {
        const filter = (m) => m.default && m.default.displayName === displayName;
        const m = getModule(filter, false);
        if (m) patch(m);
        else {
            inject(
                `reverse-image-search-${displayName}-lazy`,
                getModule(["openContextMenuLazy"], false),
                "openContextMenuLazy",
                (args) => {
                    const lazyRender = args[1];
                    args[1] = async () => {
                        const render = await lazyRender(args[0]);
                        return (config) => {
                            const menu = render(config);
                            if (menu?.type?.displayName === displayName && patch) {
                                uninject(`reverse-image-search-${displayName}-lazy`);
                                patch(getModule(filter, false));
                                patch = false;
                            }
                            return menu;
                        };
                    }
                    return args;
                },
                true
            );
        }
    }

    // This method runs when the plugin is loaded
    async startPlugin() {
        // Register Settings
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'Reverse Image Search',
            render: Settings,
        });

        // Injections
        for (var i = 0; i < ContextMenus.length; i++) {
            const ctxName = ContextMenus[i];
            this.lazyPatchContextMenu(ctxName, (ctxMenu) => {
                inject(
                    `reverse-image-search-${ctxName}`,
                    ctxMenu,
                    'default',
                    this.createReverseImageSearch.bind(this)
                );

                ctxMenu.default.displayName = ctxName;
            });
        }
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID);
        for (var i = 0; i < ContextMenus.length; i++) {
            uninject(`reverse-image-search-${ContextMenus[i]}`);
            uninject(`reverse-image-search-${ContextMenus[i]}-lazy`);
        }
    }
};
