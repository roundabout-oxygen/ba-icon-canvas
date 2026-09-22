/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ブルアカの属性カラー
        explosive: "#e53e3e", // 爆発（赤）
        piercing: "#d69e2e",  // 貫通（黄）
        mystic: "#3182ce",    // 神秘（青）
        sonic: "#805ad5",     // 振動（紫）
        lightArmor: "#e53e3e",    // 軽装備
        heavyArmor: "#d69e2e",    // 重装甲
        specialArmor: "#3182ce",  // 特殊装甲
        elasticArmor: "#805ad5",  // 弾力装甲
      }
    },
  },
  plugins: [],
}
