<template>
    <div class="h-screen bg-body-bg overflow-y-auto">
        <div class="m-auto pb-20 pt-8 px-4 max-w-screen-lg">
            <div class="flex items-center justify-between pb-4">
                <Button
                    size="sm"
                    class="w-10 h-10 text-secondary-btn-text bg-secondary-btn shadow-secondary-btn"
                    @click="back"
                >
                    <i class="bx bx-chevron-left bx-sm"></i>
                </Button>
                <div class="section-title text-center text-primary-text text-2xl font-bold">Followers</div>
                <ImgHolder
                    class="inline-flex my-auto w-10 h-10 cursor-pointer"
                    :is-rounded="true"
                    :is-border="false"
                    :src="rss3Profile.avatar"
                    :alt="rss3Profile.username"
                    @click="toPublicPage(rns, ethAddress)"
                />
            </div>
            <div class="flex flex-col gap-y-4 m-auto max-w-md">
                <FollowerCard
                    class="w-auto cursor-pointer"
                    v-for="item in followerList"
                    :key="item.address"
                    :avatar="item.avatar"
                    :name="item.username"
                    :address="item.rns || item.displayAddress"
                    @click="toPublicPage(item.rns, item.address)"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Button from '@/components/Button.vue';
import ImgHolder from '@/components/ImgHolder.vue';
import FollowerCard from '@/components/FollowerCard.vue';
import RSS3, { IRSS3 } from '@/common/rss3';
import RNSUtils from '@/common/rns';
import config from '@/config';
import { reverse, uniq } from 'lodash';
import { getName } from '@/common/utils';

interface Profile {
    avatar: string;
    username: string;
    address: string;
    bio: string;
    rns: string;
    displayAddress: string;
}

@Options({
    name: 'Followers',
    components: { ImgHolder, Button, FollowerCard },
})
export default class Followers extends Vue {
    followerList: Array<Profile> = [];
    rss3Profile: Profile = {
        avatar: config.defaultAvatar,
        username: '',
        address: '',
        bio: '',
        rns: '',
        displayAddress: '',
    };
    rns: string = '';
    ethAddress: string = '';
    lastRoute: string = '';
    isPageActive: boolean = false;
    loadingNo: number = 0;

    async setupAddress() {
        let address: string = '';
        if (config.subDomain.isSubDomainMode) {
            // Is subdomain mode
            address = getName();
        } else if (this.$route.params.address) {
            address = <string>this.$route.params.address;
        } else {
            return false;
        }

        if (address) {
            if (address.startsWith('0x')) {
                // Might be address type
                // Get RNS and redirect
                this.ethAddress = address;
                this.rns = await RNSUtils.addr2Name(address);
                if (this.rns !== '') {
                    window.location.href =
                        'https://' +
                        this.rns +
                        '.' +
                        config.subDomain.rootDomain +
                        window.location.pathname.replace(`/${address}`, '');
                }
            } else {
                // RNS
                this.rns = address;
                this.ethAddress = (await RNSUtils.name2Addr(address)).toString();
                if (parseInt(this.ethAddress) === 0) {
                    return false;
                }
            }
        }

        return true;
    }

    async initLoad() {
        this.lastRoute = this.$route.fullPath;
        this.followerList = [];
        this.loadingNo = 0;

        const rss3 = await RSS3.visitor();
        const initFollowersList = await rss3.backlinks.get(this.ethAddress, 'following');
        const followersList = uniq(reverse(initFollowersList));

        if (rss3 && followersList) {
            for (const item of followersList) {
                this.followerList.push({
                    avatar: config.defaultAvatar,
                    username: '',
                    bio: '',
                    address: item,
                    displayAddress: this.filter(item),
                    rns: '',
                });
            }
            setTimeout(() => {
                this.loadDetails(rss3);
            }, 0);
        }
    }

    async loadDetails(rss3: IRSS3) {
        const startNo = this.loadingNo;
        const endNo = this.followerList.length;
        for (let i = startNo; i < endNo; i++) {
            if (this.isPageActive) {
                const item = this.followerList[i];
                try {
                    const profile = (await rss3.profile.get(item.address)) || {};
                    item.avatar = profile.avatar?.[0] || config.defaultAvatar;
                    item.username = profile.name || '';
                    item.bio = profile.bio || '';
                    item.rns = await RNSUtils.addr2Name(item.address);
                } catch (e) {
                    console.log(item, e);
                }
                this.loadingNo = i;
            }
        }
    }

    async setupTheme() {
        const rss3 = await RSS3.visitor();
        // Setup theme
        const themes = RSS3.getAvailableThemes(await rss3.assets.get(this.ethAddress));
        if (themes[0]) {
            document.body.classList.add(themes[0].class);
        } else {
            document.body.classList.remove(...document.body.classList);
        }
    }

    async setProfile() {
        const rss3 = await RSS3.visitor();
        const profile = await rss3.profile.get(this.ethAddress);
        this.rss3Profile.avatar = profile?.avatar?.[0] || config.defaultAvatar;
        this.rss3Profile.username = profile?.name || '';
        this.rss3Profile.address = this.ethAddress;
    }

    async setPageTitleFavicon() {
        const rss3 = await RSS3.visitor();
        const profile = await rss3.profile.get(this.ethAddress);
        const favicon = <HTMLLinkElement>document.getElementById('favicon');
        favicon.href = profile?.avatar?.[0] || '/favicon.ico';
        document.title = profile?.name || 'Web3 Pass';
    }

    filter(address: string) {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    async toPublicPage(rns: string, ethAddress: string) {
        if (rns) {
            window.location.href = `//${rns}.${config.subDomain.rootDomain}`;
        } else {
            window.location.href = `//${config.subDomain.rootDomain}/${ethAddress}`;
        }
    }

    back() {
        this.$router.push(config.subDomain.isSubDomainMode ? '/' : `/${this.rns || this.ethAddress}`);
    }

    async activated() {
        this.isPageActive = true;
        await this.setupAddress();
        setTimeout(async () => {
            await this.setupTheme();
            await this.setPageTitleFavicon();
            if (this.lastRoute !== this.$route.fullPath) {
                await this.setProfile();
                await this.initLoad();
            } else if (this.loadingNo < this.followerList.length) {
                await this.loadDetails(await RSS3.visitor());
            }
        }, 0);
    }

    async deactivated() {
        this.isPageActive = false;
    }
}
</script>

<style></style>
