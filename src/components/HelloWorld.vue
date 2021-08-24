<template>
  <div class="main">
    <img
      id="imgDemo"
      :src="originImg"
      alt=""
      @load="loadImg"
      :style="'left:' + -imgWidth + 'px'"
    />
    <div class="header"></div>
    <div class="canvas-content">
      <div class="origin-box">
        <canvas
          ref="originCan"
          id="beforeCan"
          :width="canWidth"
          :height="canHeight"
        ></canvas>
        <canvas
          ref="layerCan"
          id="layer"
          :width="canWidth"
          :height="canHeight"
          @click="pickPoint"
        ></canvas>

        <el-upload
          ref="logoUpload"
          class="avatar-uploader"
          action="http://localhost:3000/api/upload/uploadImg"
          :show-file-list="false"
          :on-success="handleAvatarSuccess"
          :before-upload="beforeAvatarUpload"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </div>
      <div class="opereation-box">
        <div class="removeColor">
          <h3>清除颜色：</h3>
          <el-button @click="handleTrans('remove')" :disabled="!fromColor"
            >清除</el-button
          >
        </div>
        <div class="replace-color">
          <h3>颜色替换：</h3>
          <el-color-picker
            v-model="fromColor"
            :show-alpha="true"
          ></el-color-picker>
          <el-button
            class="replace-btn"
            @click="handleTrans"
            :disabled="!fromColor"
            >替换</el-button
          >
          <el-color-picker
            v-model="toColor"
            :show-alpha="true"
          ></el-color-picker>
        </div>
      </div>
      <div class="trans-box">
        <canvas
          ref="transCan"
          id="transCan"
          :width="canWidth"
          :height="canHeight"
          @click="pickPoint"
        ></canvas>
        <div class="box">
          <el-button size="small" type="primary" @click="downloadPng"
            >下载图片</el-button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "HelloWorld",
  props: {
    msg: String,
  },
  data() {
    return {
      canWidth: 400,
      canHeight: 400,
      originCtx: null,
      layerCtx: null,
      transCtx: null,
      selectedColor: [],
      imgWidth: 400,
      imageData: {},
      toColor: "rgba(0, 0, 0, 0)",
      originImg: "",
      loadFileName: "",
    };
  },
  computed: {
    fromColor() {
      const res = this.selectedColor.map((e, index) => {
        return index === 3 ? e / 255 : e;
      });
      return res.length ? "rgba(" + res.join(",") + ")" : null;
    },
  },
  mounted() {
    this.$nextTick(() => {});
  },
  methods: {
    // 图片加载完成
    loadImg(e) {
      const img = e.target;
      const width = img.offsetWidth;
      const height = img.offsetHeight;
      this.imgWidth = width;
      this.canHeight = (height / width) * this.canWidth;
      setTimeout(() => {
        this.originCtx = this.$refs.originCan.getContext("2d");
        this.layerCtx = this.$refs.layerCan.getContext("2d");
        this.transCtx = this.$refs.transCan.getContext("2d");

        this.originCtx.scale(this.canWidth / width, this.canWidth / width);
        this.originCtx.drawImage(img, 0, 0);

        this.imageData = this.originCtx.getImageData(
          0,
          0,
          this.canWidth,
          this.canHeight
        );
      }, 0);
    },
    // 图片数据转化
    handleTrans(mode = "replace") {
      this.toColor;
      const _toColor = this.toColor.split(/\(|\)/)[1].split(",");
      console.log(_toColor);
      const data = this.imageData.data || [];
      console.time("no-worker");
      for (let i = 0; i < data.length; i += 4) {
        const similar = this.isSimilar(
          this.selectedColor,
          data.slice(i, i + 4)
        );
        if (similar) {
          if (mode === "remove") {
            data[i + 3] = 0;
          } else {
            data[i] = _toColor[0];
            data[i + 1] = _toColor[1];
            data[i + 2] = _toColor[2];
            data[i + 3] = _toColor[3] * 255;
          }
        }
      }
      console.timeEnd("no-worker");
      this.transCtx.putImageData(this.imageData, 0, 0);
      this.imageData = this.transCtx.getImageData(
        0,
        0,
        this.canWidth,
        this.canHeight
      );
    },
    // 点击位置的颜色值
    pickPoint(e) {
      this.selectedColor = this.originCtx.getImageData(
        e.layerX,
        e.layerY,
        1,
        1
      ).data;
      const _color = this.getOpposite(this.selectedColor);
      this.canWidth = this.canWidth + 0;
      this.layerCtx.strokeStyle = _color;
      this.layerCtx.clearRect(0, 0, this.canWidth, this.canHeight);
      this.layerCtx.strokeRect(e.layerX - 3, e.layerY - 3, 6, 6);
    },
    // 反色
    getOpposite(color) {
      const res = [];
      for (let i = 0; i < 3; i++) {
        res.push(255 - color[i]);
      }
      res.push(255);
      return `rgba(${res.join(",")})`;
    },
    // 相似颜色域
    isSimilar(arr1, arr2) {
      if (arr1.length !== arr2.length) return false;
      for (let i = 0; i < arr1.length; i++) {
        if (Math.abs(arr1[i] - arr2[i]) > 20) {
          return false;
        }
      }
      return true;
    },

    handleAvatarSuccess(res, file) {
      console.log("res, file", res, file, file.response.filename);
      this.loadFileName = file.response.filename;
      this.originImg = URL.createObjectURL(file.raw);
    },

    beforeAvatarUpload(file) {
      const isImage = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ].includes(file.type);
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isImage) {
        this.$message.error("上传头像必须是图片格式!");
      }
      if (!isLt2M) {
        this.$message.error("上传头像图片大小不能超过 2MB!");
      }
      return isImage && isLt2M;
    },
    downloadPng() {
      const imgData = this.$refs.transCan.toDataURL("image/png");
      console.log("imgdata", imgData);
      const save_link = document.createElement("a");
      save_link.href = imgData;
      save_link.download = "download.png";
      save_link.click();
    },
  },
};
</script>

<style scoped lang="scss">
.canvas-content {
  display: flex;
  justify-content: center;
  .origin-box {
    border: 1px solid red;
    position: relative;
    #layer {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 9;
    }
  }
  .trans-box {
    border: 1px solid green;
  }
  .opereation-box {
    display: flex;
    flex-direction: column;
    flex: 170px 0 0;
    text-align: left;
    padding: 6px 24px;
    .replace-btn {
      vertical-align: top;
      margin: 0 6px;
    }
  }
}
#imgDemo {
  position: absolute;
  left: -400px;
}
</style>
