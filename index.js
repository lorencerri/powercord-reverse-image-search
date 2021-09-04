const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { getModule } = require('powercord/webpack');
const { ContextMenu } = require('powercord/components');
const { getOwnerInstance } = require('powercord/util');
const Settings = require('./Settings.jsx');
const providers = require('./providers.json');

/**
 * Hey, if you're reading this I'd appreciate some feedback!
 * This is my first powercord plugin, so please tell me if I'm doing something incorrectly.
 */

module.exports = class ReverseImageSearch extends Plugin {
    toSnake(str) {
        return str.split(' ').join('-').toLowerCase();
    }

    get providers() {
        return providers.filter(i =>
            this.settings.get(`RIS-provider-${this.toSnake(i.name)}`, i.default)
        );
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

    async startPlugin() {
        // Register Settings
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'Reverse Image Search',
            render: Settings,
        });

        const { imageWrapper } = await getModule(['imageWrapper']);

        // User Injection
        const GuildChannelUserContextMenu = await getModule(
            m => m.default?.displayName === 'GuildChannelUserContextMenu'
        );

        inject(
            'reverse-image-search-users',
            GuildChannelUserContextMenu,
            'default',
            ([{ target }], res) => {
                const children = res.props.children.props.children;

                if (target.tagName.toLowerCase() === 'img') {
                    const _providers = this.providers;

                    // Display (One Selected)
                    if (_providers.length === 1) {
                        children.push(
                            ...ContextMenu.renderRawItems([
                                this.createMenuButton(
                                    'Reverse Image Search',
                                    'menu',
                                    () =>
                                        this.open(_providers[0].domain, target)
                                ),
                            ])
                        );
                    }

                    // Display (Multiple Selected)
                    if (_providers.length > 1) {
                        const providersCtx = this.providers.map((i, index) =>
                            this.createMenuButton(i.name, index, () =>
                                this.open(i.domain, target)
                            )
                        );

                        // Add "All" button if enabled in settings
                        if (this.settings.get('RIS-openAll'))
                            providersCtx.unshift(
                                this.createMenuButton('All', 'all', () =>
                                    _providers.forEach(i =>
                                        this.open(i.domain, target)
                                    )
                                )
                            );

                        children.push(
                            ...ContextMenu.renderRawItems([
                                {
                                    type: 'submenu',
                                    name: 'Reverse Image Search',
                                    id: 'reverse-image-search-submenu',
                                    getItems: () => providersCtx,
                                },
                            ])
                        );
                    }
                }
                return res;
            }
        );

        // Message Injection
        const mdl = await getModule(
            m => m.default?.displayName === 'MessageContextMenu'
        );

        inject(
            'reverse-image-search-messages',
            mdl,
            'default',
            ([{ target }], res) => {
                if (
                    target.tagName.toLowerCase() === 'img' &&
                    target.parentElement.classList.contains(imageWrapper)
                ) {
                    const _providers = this.providers;

                    // Display (One Selected)
                    if (_providers.length === 1) {
                        res.props.children.push(
                            ...ContextMenu.renderRawItems([
                                this.createMenuButton(
                                    'Reverse Image Search',
                                    'menu',
                                    () =>
                                        this.open(_providers[0].domain, target)
                                ),
                            ])
                        );
                    }

                    // Display (Multiple Selected)
                    if (_providers.length > 1) {
                        const providersCtx = this.providers.map((i, index) =>
                            this.createMenuButton(i.name, index, () =>
                                this.open(i.domain, target)
                            )
                        );

                        // Add "All" button if enabled in settings
                        if (this.settings.get('RIS-openAll'))
                            providersCtx.unshift(
                                this.createMenuButton('All', 'all', () =>
                                    _providers.forEach(i =>
                                        this.open(i.domain, target)
                                    )
                                )
                            );

                        res.props.children.push(
                            ...ContextMenu.renderRawItems([
                                {
                                    type: 'submenu',
                                    name: 'Reverse Image Search',
                                    id: 'reverse-image-search-submenu',
                                    getItems: () => providersCtx,
                                },
                            ])
                        );
                    }
                }
                return res;
            }
        );

        mdl.default.displayName = 'MessageContextMenu';
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID);
        uninject('reverse-image-search-messages');
        uninject('reverse-image-search-users');
    }
};
