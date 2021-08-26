<template lang="pug">
.main
  img#imgDemo(
    :src="originImg",
    @load="loadImg",
    :style="'left:' + -imgWidth + 'px;top:' + -imgHeight + 'px'"
  )

  .canvas-content
    el-col.origin-box(
      ref="originBox",
      :xs="24",
      :sm="24",
      :md="12",
      :lg="{ span: 8, offset: 2 }",
      :xl="{ span: 8, offset: 2 }"
    )
      .origin-canvas-content(
        ref="originCanvasContent",
        :style="'width:' + canWidth + 'px'"
      )
        canvas#beforeCan(
          ref="originCan",
          :width="canWidth",
          :height="canHeight"
        )
        canvas#layer(
          ref="layerCan",
          :width="canWidth",
          :height="canHeight",
          @click="pickPoint"
        )
        el-upload.avatar-uploader(
          ref="logoUpload",
          accept="image/*",
          action="#",
          :auto-upload="false",
          :on-change="handleStatusChange"
        )
          el-button(size="small", type="primary") 点击上传

    el-col.opereation-box(:xs="24", :sm="24", :md="12", :lg="4", :xl="4")
      .removeColor
        h3 清除颜色：
        el-button(@click="handleTrans('remove')", :disabled="!fromColor") 清除

      .replace-color
        h3 颜色替换：
        el-color-picker(v-model="fromColor", :show-alpha="true")
        el-button.replace-btn(
          @click="() => handleTrans()",
          :disabled="!fromColor"
        ) 替换
        el-color-picker(v-model="toColor", :show-alpha="true")

    el-col.trans-box(:xs="24", :sm="24", :md="12", :lg="8", :xl="8")
      canvas#transCan(
        ref="transCan",
        :width="canWidth",
        :height="canHeight",
        @click="pickPoint"
      )
      .box
        el-button(size="small", type="primary", @click="downloadPng") 下载图片
        el-button(size="small", type="primary", @click="resetImgData") 重置
        el-button(
          size="small",
          type="primary",
          @click="undo",
          :disabled="disUndo"
        ) 后退
        el-button(
          size="small",
          type="primary",
          @click="redo",
          :disabled="!index"
        ) 前进
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
      imgHeight: 400,
      imageData: {},
      toColor: "rgba(0, 0, 0, 0)",
      originImg: "",
      loadFileName: "",
      imgStock: [],
      index: 0,
    };
  },
  computed: {
    fromColor() {
      const res = this.selectedColor.map((e, index) => {
        return index === 3 ? e / 255 : e;
      });
      return res.length ? "rgba(" + res.join(",") + ")" : null;
    },
    transColor() {
      return this.toColor.split(/\(|\)/)[1].split(",");
    },
    disUndo() {
      return this.index >= this.imgStock.length - 1;
    },
  },
  mounted() {
    this.$nextTick(() => {
      const contentWidth = document.querySelector("#app").offsetWidth;
      this.canWidth = Math.min(contentWidth - 12, this.canWidth);
    });
  },
  methods: {
    // 图片加载完成
    loadImg(e) {
      const img = e.target;
      const width = img.offsetWidth;
      const height = img.offsetHeight;
      this.imgWidth = width;
      this.imgHeight = height;
      this.canHeight = (height / width) * this.canWidth;
      setTimeout(() => {
        this.originCtx = this.$refs.originCan.getContext("2d");
        this.layerCtx = this.$refs.layerCan.getContext("2d");
        this.transCtx = this.$refs.transCan.getContext("2d");

        this.originCtx.scale(this.canWidth / width, this.canWidth / width);
        this.originCtx.drawImage(img, 0, 0);

        this.resetImgData();
      }, 0);
    },
    addStock(params) {
      if (this.index) {
        this.imgStock = this.imgStock.slice(this.index);
        this.index = 0;
      }
      if (this.imgStock.length >= 10) {
        this.imgStock.pop();
      }
      this.imgStock.unshift(JSON.stringify(params));
    },
    undo() {
      this.index++;
      this.redrawImg();
    },
    redo() {
      this.index--;
      this.redrawImg();
    },
    redrawImg() {
      const preImageData = JSON.parse(this.imgStock[this.index]).data;
      this.imageData = this.transCtx.createImageData(
        this.canWidth,
        this.canHeight
      );
      for (let i = 0; i < this.imageData.data.length; i++) {
        this.imageData.data[i] = preImageData[i];
      }
      this.transCtx.putImageData(this.imageData, 0, 0);
    },
    // 图片数据转化
    handleTrans(
      mode = "replace",
      _fromColor = this.selectedColor,
      toColor = this.transColor,
      stock = true
    ) {
      const _toColor = mode === "remove" ? [0, 0, 0, 0] : toColor;

      const data = this.imageData.data || [];
      console.time("no-worker");
      for (let i = 0; i < data.length; i += 4) {
        const similar = this.isSimilar(_fromColor, data.slice(i, i + 4));
        if (similar) {
          data[i] = _toColor[0];
          data[i + 1] = _toColor[1];
          data[i + 2] = _toColor[2];
          data[i + 3] = _toColor[3] * 255;
        }
      }
      console.timeEnd("no-worker");
      stock && this.addStock(this.imageData);
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

    handleStatusChange(file) {
      // console.log(file);
      this.originImg = URL.createObjectURL(file.raw);
    },

    downloadPng() {
      const imgData = this.$refs.transCan.toDataURL("image/png");
      const save_link = document.createElement("a");
      save_link.href = imgData;
      save_link.download = "download.png";
      save_link.click();
    },
    resetImgData() {
      this.imgStock = [];
      this.index = 0;
      this.selectedColor = this.$options.data().selectedColor;
      this.toColor = this.$options.data().toColor;
      this.imageData = this.originCtx.getImageData(
        0,
        0,
        this.canWidth,
        this.canHeight
      );
      this.transCtx.clearRect(0, 0, this.canWidth, this.canHeight);
      this.addStock(this.imageData);
    },
  },
};
</script>

<style scoped lang="scss">
.main {
  width: 100%;
  // height: 100%;
  // overflow: hidden;
  position: absolute;
  left: 0;
  top: 0;
}
.canvas-content {
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffff;
  .el-col {
    padding: 6px;
  }
  canvas {
    cursor: pointer;
  }
  .origin-box {
    border: 1px solid red;
    .origin-canvas-content {
      position: relative;
      margin: 0 auto;
    }
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
    justify-content: center;
    .replace-btn {
      vertical-align: top;
      margin: 0 6px;
    }
  }
}
#imgDemo {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
