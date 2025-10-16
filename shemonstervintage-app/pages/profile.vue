<template>
  <div>
    <h2>Profile Page</h2>
    <p>Helloe {{ userInfo.user.name }}</p>
    <p>User Email: {{ userInfo.user.email }}</p>

    <form @submit.prevent="changePassword(oldPwd, newPwd)">
      <input v-model="oldPwd" placeholder="Old Password" type="password" />
      <input v-model="newPwd" placeholder="New Password" type="password" />
      <button type="submit">Change Password</button>
    </form>

    <button @click="deleteAccount">Delete Account</button>
  </div>
</template>

<script setup>
import { onMounted, nextTick } from "vue";
import { userLoggIn, userInfo } from "@/composables/refsHelper.js";

definePageMeta({
  layout: "three",
});

async function deleteAccount() {
  try {
    console.log("START");
    console.log();
    const res = await fetch("http://localhost:8000/auth/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userInfo.value.user.email }),
      credentials: "include", // send cookie
    });

    userLoggIn.value = false;
  } catch (err) {
    console.log(err);
  }
}

async function changePassword(oldPassword, newPassword) {
  try {
    console.log("CHANGE PASSWORD START");

    const res = await fetch("http://localhost:8000/auth/changepassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
      credentials: "include", // send auth cookie
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Failed:", data);
      return;
    }

    console.log("Password changed successfully:", data);
    alert("Password updated successfully!");
  } catch (err) {
    console.error("Error changing password:", err);
  }
}

onMounted(async () => {
  console.log("mounted");
});
</script>
