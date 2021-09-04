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

    async startPlugin() {
        // Register Settings
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'Reverse Image Search',
            render: Settings,
        });

        // Image Injection
        const { imageWrapper } = await getModule(['imageWrapper']);
        const mdl = await getModule(
            m => m.default && m.default.displayName === 'MessageContextMenu'
        );

        inject('reverse-image-search', mdl, 'default', ([{ target }], res) => {
            if (
                target.tagName.toLowerCase() === 'img' &&
                target.parentElement.classList.contains(imageWrapper)
            ) {
                const _providers = this.providers;

                // Display (One Selected)
                if (_providers.length === 1) {
                    res.props.children.push(
                        ...ContextMenu.renderRawItems([
                            {
                                type: 'button',
                                name: 'Reverse Image Search',
                                id: 'reverse-image-search-single',
                                onClick: () => {
                                    this.open(_providers[0].domain, target);
                                },
                            },
                        ])
                    );
                }

                // Display (Multiple Selected)
                if (_providers.length > 1) {
                    const providersCtx = this.providers.map((i, index) => ({
                        type: 'button',
                        name: i.name,
                        id: `reverse-image-search-item-${index}`,
                        onClick: () => {
                            this.open(i.domain, target);
                        },
                    }));

                    if (this.settings.get('RIS-openAll'))
                        providersCtx.unshift({
                            type: 'button',
                            name: 'All',
                            id: `reverse-image-search-item-all`,
                            onClick: () => {
                                _providers.forEach(i =>
                                    this.open(i.domain, target)
                                );
                            },
                        });

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
        });

        mdl.default.displayName = 'MessageContextMenu';
    }

    pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID);
        uninject('reverse-image-search');
    }
};
