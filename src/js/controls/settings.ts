import PlayerComponent from '../interfaces/component';
import EventsList from '../interfaces/events-list';
import SettingsItem from '../interfaces/settings/item';
import SettingsSubItem from '../interfaces/settings/subitem';
import SettingsSubMenu from '../interfaces/settings/submenu';
import Player from '../player';
import { hasClass } from '../utils/general';

/**
 *
 * @class Settings
 * @description Class that handles the Settings behavior cross/browsers
 */
class Settings implements PlayerComponent {
    private player: Player;
    private submenu: SettingsSubMenu = {};
    private button: HTMLButtonElement;
    private menu: HTMLElement;
    private events: EventsList = {
        global: {},
        media: {},
    };
    private originalStatus: string;
    private clickEvent: () => void;
    private hideEvent: () => void;

    /**
     *
     * @param {Player} player
     * @returns {Settings}
     * @memberof Settings
     */
    constructor(player: Player) {
        this.player = player;
        return this;
    }
    /**
     *
     *
     * @returns {Settings}
     * @memberof Settings
     */
    public create(): void {
        this.button = document.createElement('button');
        this.button.className = 'om-controls__settings om-control__right';
        this.button.tabIndex = 0;
        this.button.title = 'Player Settings';
        this.button.setAttribute('aria-controls', this.player.id);
        this.button.setAttribute('aria-pressed', 'false');
        this.button.setAttribute('aria-label', 'Player Settings');
        this.button.innerHTML = '<span class="om-sr">Player Settings</span>';

        this.menu = document.createElement('div');
        this.menu.className = 'om-settings';
        this.menu.setAttribute('aria-hidden', 'true');
        this.menu.innerHTML = '<div class="om-settings__menu" role="menu"></div>';

        this.clickEvent = () => {
            this.button.setAttribute('aria-pressed', 'true');
            this.menu.setAttribute('aria-hidden', (this.menu.getAttribute('aria-hidden') === 'false' ? 'true' : 'false'));
        };

        this.hideEvent = () => {
            this.menu.innerHTML = this.originalStatus;
            this.menu.setAttribute('aria-hidden', 'true');
        };

        this.events.media['controls.hide'] = this.hideEvent.bind(this);
        this.events.media.play = this.hideEvent.bind(this);
        this.events.media.pause = this.hideEvent.bind(this);

        this.events.global.click = (e: any) => {
            if (e.target.closest(`#${this.player.id}`) && hasClass(e.target, 'om-speed__option')) {
                this.player.getMedia().playbackRate = parseFloat(e.target.getAttribute('data-value').replace('speed-', ''));
            }
        };
        this.events.global.resize = this.hideEvent.bind(this);

        this.button.addEventListener('click', this.clickEvent.bind(this));
        Object.keys(this.events).forEach(event => {
            this.player.getElement().addEventListener(event, this.events.media[event]);
        });
        document.addEventListener('click', this.events.global.click);
        window.addEventListener('resize', this.events.global.resize);

        this.player.getControls().getContainer().appendChild(this.button);
        this.player.getContainer().appendChild(this.menu);
    }

    public destroy(): void {
        this.button.removeEventListener('click', this.clickEvent.bind(this));
        Object.keys(this.events).forEach(event => {
            this.player.getElement().removeEventListener(event, this.events.media[event]);
        });
        document.removeEventListener('click', this.events.global.click);
        window.removeEventListener('resize', this.events.global.resize);
        if (this.events.global['settings.submenu'] !== undefined) {
            document.removeEventListener('click', this.events.global['settings.submenu']);
            this.player.getElement().removeEventListener('controls.hide', this.hideEvent);
        }

        this.menu.remove();
        this.button.remove();

        // Restore original playback rate
        this.player.getMedia().playbackRate = 1;
    }
    /**
     * By default, Settings will contaim speed adjustments
     *
     * @returns {SettingItem}
     * @memberof Settings
     */
    public addSettings(): SettingsItem {
        return {
            className: 'om-speed__option',
            default: '1',
            key: 'speed',
            name: 'Speed',
            subitems: [
                {key: '0.25', label: '0.25'},
                {key: '0.5', label: '0.5'},
                {key: '0.75', label: '0.75'},
                {key: '1', label: 'Normal'},
                {key: '1.25', label: '1.25'},
                {key: '1.5', label: '1.5'},
                {key: '2', label: '2'},
            ],
        };
    }

    public addItem(name: string, key: string, defaultValue: string, submenu?: SettingsSubItem[], className?: string): void {
        // Build the menu entry first
        const menuItem = document.createElement('div');
        menuItem.className = 'om-settings__menu-item';
        menuItem.tabIndex = 0;
        menuItem.setAttribute('role', 'menuitemradio');
        menuItem.innerHTML = `<div class="om-settings__menu-label" data-value="${key}-${defaultValue}">${name}</div>
            <div class="om-settings__menu-content">${submenu.find(x => x.key === defaultValue).label}</div>`;

        this.menu.querySelector('.om-settings__menu').appendChild(menuItem);
        this.originalStatus = this.menu.innerHTML;

        // Store the submenu to reach all options for current menu item
        if (submenu) {
            const subItems = `
                <div class="om-settings__header">
                    <button type="button" class="om-settings__back">${name}</button>
                </div>
                <div class="om-settings__menu" role="menu" id="menu-item-${key}">
                    ${submenu.map((item: SettingsSubItem) => `
                    <div class="om-settings__submenu-item" tabindex="0" role="menuitemradio"
                        aria-checked="${defaultValue === item.key ? 'true' : 'false'}">
                        <div class="om-settings__submenu-label ${className || ''}" data-value="${key}-${item.key}">${item.label}</div>
                    </div>`).join('')}
                </div>`;
            this.submenu[key] = subItems;
        }

        this.events.global['settings.submenu'] = (e: Event) => {
            const target = (e.target as HTMLElement);
            if (target.closest(`#${this.player.id}`)) {
                if (hasClass(target, 'om-settings__back')) {
                    this.menu.classList.add('om-settings--sliding');
                    setTimeout(() => {
                        this.menu.innerHTML = this.originalStatus;
                        this.menu.classList.remove('om-settings--sliding');
                    }, 100);
                } else if (hasClass(target, 'om-settings__menu-content')) {
                    const current = target.parentElement.querySelector('.om-settings__menu-label')
                        .getAttribute('data-value').replace(/(.*?)\-\w+$/, '$1');

                    if (typeof this.submenu[current] !== undefined) {
                        this.menu.classList.add('om-settings--sliding');
                        setTimeout(() => {
                            this.menu.innerHTML = this.submenu[current];
                            this.menu.classList.remove('om-settings--sliding');
                        }, 100);
                    }
                } else if (hasClass(target, 'om-settings__submenu-label')) {
                    const current = target.getAttribute('data-value');
                    const value = current.replace(`${key}-`, '');
                    const label = target.innerText;

                    // Update values in submenu and store
                    const menuTarget = this.menu.querySelector(`#menu-item-${key} .om-settings__submenu-item[aria-checked=true]`);
                    if (menuTarget) {
                        menuTarget.setAttribute('aria-checked', 'false');
                        target.parentElement.setAttribute('aria-checked', 'true');
                        this.submenu[key] = this.menu.innerHTML;

                        // Restore original menu, and set the new value
                        this.menu.classList.add('om-settings--sliding');
                        setTimeout(() => {
                            this.menu.innerHTML = this.originalStatus;
                            const prev = this.menu.querySelector(`.om-settings__menu-label[data-value="${key}-${defaultValue}"]`);
                            prev.setAttribute('data-value', `${current}`);
                            prev.nextElementSibling.innerHTML = label;
                            defaultValue = value;
                            this.originalStatus = this.menu.innerHTML;
                            this.menu.classList.remove('om-settings--sliding');
                        }, 100);
                    }
                }
            } else {
                this.hideEvent();
            }
        };

        document.addEventListener('click', this.events.global['settings.submenu']);
        this.player.getElement().addEventListener('controls.hide', this.hideEvent);
    }
}

export default Settings;