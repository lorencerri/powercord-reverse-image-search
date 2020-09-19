const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { getModule } = require('powercord/webpack');
const { ContextMenu } = require('powercord/components');
const { getOwnerInstance } = require('powercord/util');

module.exports = class ReverseImageSearch extends Plugin {
    async startPlugin() {
        const { imageWrapper } = await getModule(['imageWrapper']);
        const mdl = await getModule(
            m => m.default && m.default.displayName === 'MessageContextMenu'
        );

        inject('reverseImageSearch', mdl, 'default', ([{ target }], res) => {
            if (
                target.tagName.toLowerCase() === 'img' &&
                target.parentElement.classList.contains(imageWrapper)
            ) {
                res.props.children.push(
                    ...ContextMenu.renderRawItems([
                        {
                            type: 'button',
                            name: 'Reverse Image Search',
                            onClick: () =>
                                window.open(
                                    'https://www.google.com/searchbyimage?image_url=' +
                                        encodeURI(
                                            getOwnerInstance(target).props
                                                .href || target.src
                                        ),
                                    '_blank'
                                )
                        }
                    ])
                );
            }
            return res;
        });
    }

    pluginWillUnload() {
        uninject('reverseImageSearch');
    }
};
