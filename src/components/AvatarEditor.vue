<template>
    <label class="avatar" :class="size">
        <img class="image" :src="newUrl || url" v-show="newUrl || url" alt="Avatar Upload" />
        <div
            class="plus"
            :class="{
                fill: newUrl || url,
            }"
        >
            <i class="bx bx-plus bx-sm text-white fill-current" />
        </div>
        <input type="file" class="hidden" accept="image/*" @change="preview" />
    </label>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import ipfs from '@/common/ipfs';

@Options({
    props: {
        size: String,
        url: String,
    },
})
export default class Avatar extends Vue {
    file?: File;
    newUrl: string = '';
    $gtag: any;

    preview(evt: any) {
        this.file = evt.target?.files?.[0];
        this.newUrl = URL.createObjectURL(this.file);
    }

    async upload() {
        if (this.file) {
            this.$gtag.event('avatarUpload', {});
            return ipfs.upload(this.file);
        } else {
            return null;
        }
    }
}
</script>

<style scoped lang="postcss">
@layer components {
    .avatar {
        @apply relative flex items-center justify-center bg-input-bg rounded-full cursor-pointer;

        &.sm {
            @apply w-14 h-14;
        }
        &.md {
            @apply w-16 h-16;
        }
        &.lg {
            @apply w-24 h-24;
        }

        .image {
            @apply absolute left-0 top-0 w-full h-full rounded-full object-contain object-cover object-center;
        }

        .plus {
            @apply z-0 flex items-center justify-center w-full h-full rounded-full;

            &.fill {
                @apply bg-black bg-opacity-40;
            }
        }
    }
}
</style>
