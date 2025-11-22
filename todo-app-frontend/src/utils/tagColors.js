export const getTagColor = (name) => {
  const colors = [
    "#ff7675", "#74b9ff", "#55efc4", "#ffeaa7",
    "#a29bfe", "#fab1a0", "#81ecec", "#fd79a8",
    "#636e72", "#fdcb6e"
  ];

  // Hash để tạo màu cố định cho mỗi tên tag
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }

  return colors[sum % colors.length];
};
