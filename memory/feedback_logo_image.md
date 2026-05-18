---
name: feedback-logo-image
description: Cách dùng logo.png (ảnh vuông 1:1 có nhiều whitespace) trong React Native header
metadata:
  type: feedback
---

Logo file `assets/images/logo.png` là ảnh vuông 1:1 với whitespace lớn xung quanh text.

Cách đúng để hiện logo đẹp trong header:

```tsx
<Image
  source={require('../../assets/images/logo.png')}
  style={{ width: 200, height: 200, marginLeft: -40, marginTop: -80, marginBottom: -80 }}
  resizeMode="contain"
/>
```

**Why:** Ảnh gốc không crop sát text — dùng negative margin để "tràn" whitespace ra ngoài, chỉ hiện phần text logo.

**How to apply:** Dùng pattern này bất cứ khi nào cần hiện logo trong header, tab bar, hoặc splash — không resize nhỏ mà không có negative margin.
