<template>
    <div class="fixed left-0 top-0 flex items-center justify-center m-0 p-0 w-screen h-screen bg-black bg-opacity-50">
        <div class="body flex flex-col gap-56 items-center justify-start px-4 h-2/3">
            <Loading :size="200" />
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Loading from '@/components/Loading.vue';
@Options({
    components: {
        Loading,
    },
})
export default class LoadingContainer extends Vue {}
</script>

<style lang="postcss" scoped></style>
