<template>
    <div class="badges-container">
        <div
            v-if="collectionImg"
            class="badge"
            :class="{
                'badge-overlay': location === 'overlay',
                'badge-header': location === 'header',
            }"
            :style="{ backgroundImage: `url(${collectionImg})` }"
        ></div>
        <div
            class="badge bg-white"
            :class="{
                'bg-BSC': chain === 'BSC',
                'bg-Ethereum': chain === 'Ethereum',
                'bg-Polygon': chain === 'Polygon',
                'bg-Ronin': chain === 'Ronin',
                'badge-overlay': location === 'overlay',
                'badge-header': location === 'header',
            }"
        ></div>
    </div>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-class-component';

@Options({
    props: {
        location: String, // 'overlay' or 'header'
        chain: String,
        collectionImg: String,
    },
})
export default class NFTBadges extends Vue {
    location!: String;
    chain!: String;
    collectionImg!: String;
}
</script>

<style scoped lang="postcss">
@layer components {
    .badges-container {
        @apply flex flex-row gap-1 items-center justify-end;
    }

    .badge {
        @apply bg-item-bg bg-cover bg-center bg-no-repeat border-sm border-item-border rounded-full shadow-nft;
    }
    .badge-overlay {
        @apply w-6 h-6;
    }
    .badge-header {
        @apply w-7 h-7;
    }
}
</style>
