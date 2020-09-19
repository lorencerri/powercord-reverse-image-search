const { React } = require('powercord/webpack');
const { SwitchItem, Category } = require('powercord/components/settings');
const providers = require('./providers.json');

module.exports = class Settings extends React.Component {
    constructor(props) {
        super(props);
        this.state = { categoryOpened: true };
        this.getSetting = props.getSetting;
        this.toggleSetting = props.toggleSetting;
    }

    get toggledProviders() {
        return providers;
    }

    toSnake(str) {
        return str.split(' ').join('-').toLowerCase();
    }

    render() {
        return (
            <div>
                <Category
                    name='Providers'
                    description='Toggle the various reverse image search providers'
                    opened={this.state.categoryOpened}
                    onChange={() =>
                        this.setState({
                            categoryOpened: !this.state.categoryOpened
                        })
                    }
                >
                    {providers.map(i => (
                        <SwitchItem
                            value={this.getSetting(
                                `RIS-provider-${this.toSnake(i.name)}`,
                                i.default
                            )}
                            onChange={() =>
                                this.toggleSetting(
                                    `RIS-provider-${this.toSnake(i.name)}`
                                )
                            }
                        >
                            {i.name}
                        </SwitchItem>
                    ))}
                </Category>
            </div>
        );
    }
};
