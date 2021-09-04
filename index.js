const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { getModule } = require('powercord/webpack');
const { ContextMenu } = require('powercord/components');
const { getOwnerInstance } = require('powercord/util');

const Settings = require('./Settings.jsx');
const Providers = require('./providers.json');

// TODO: Move this to settings
const ContextMenus = [
    'MessageContextMenu',
    'GuildContextMenu',
    'GuildChannelUserContextMenu',
];

module.exports = class ReverseImageSearch extends Plugin {
    toSnake(str) {
        return str.split(' ').join('-').toLowerCase();
    }

    open(uri, target) {
        return window.open(
            uri.replace(
                '%%',
                encodeURI(target.parentElement.href || target.src)
            ),
            '_blank'
        );
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

        // Change image target
        let target = props[0].target;
        if (target?.children[0]) target = target.children[0]; // Guild Icons

        // Change children target
        let children = res.props.children;
        if (children?.props?.children) children = children.props.children; // User Avatars

        // If target isn't an image, return
        if (target.tagName.toLowerCase() !== 'img') return res;

        // Display (One provider selected)
        if (providers.length === 1) {
            children.push(
                ...ContextMenu.renderRawItems([
                    this.createMenuButton('Reverse Image Search', 'menu', () =>
                        this.open(_providers[0].domain, target)
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
            const ctxMenu = await getModule(
                m => m.default?.displayName === ctxName
            );

            inject(
                `reverse-image-search-${ctxName}`,
                ctxMenu,
                'default',
                this.createReverseImageSearch.bind(this)
            );

            ctxMenu.default.displayName = ctxName;
        }
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID);
        for (var i = 0; i < ContextMenus.length; i++) {
            uninject(`reverse-image-search-${ContextMenus[i]}`);
        }
    }
};
