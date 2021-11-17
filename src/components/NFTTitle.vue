<template>
    <div class="flex flex-col gap-y-2 w-full text-nft-title">
        <div class="text-2xl font-bold">Total</div>
        <div class="flex flex-row gap-x-12 justify-start w-full text-lg font-normal">
            <div>
                <div class="text-xl font-medium">
                    <vue3-autocounter
                        ref="counter"
                        :startAmount="0"
                        :endAmount="parseInt(totalNFTs)"
                        :duration="1"
                        separator=","
                        :autoinit="true"
                    />
                </div>
                <div>NFTs</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Vue3Autocounter from 'vue3-autocounter';

@Options({
    components: { Vue3Autocounter },
    props: {
        totalNFTs: Number,
    },
})
export default class NFTTitle extends Vue {}
</script>

<style></style>
