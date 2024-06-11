<template>
  <div>
    <v-avatar v-if="count == expected" color="success" fab size="30" class="mr-3">
      <v-icon color="white" outlined>mdi-check</v-icon>
    </v-avatar>
    <v-avatar v-else color="error" fab size="30" class="mr-3">
      <v-icon color="white" outlined>mdi-check</v-icon>
    </v-avatar>
  </div>
</template>
<script>
export default {
  props: ["count", "expected"],
};
</script>
