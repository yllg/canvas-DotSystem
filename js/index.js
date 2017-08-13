

var S = {
  //自执行函数最先初始化一遍，然后S.init调用主函数入口，init函数
  init: function () {
    //取url，找到参数a的位置，没有的话 i 为-1
    var action = window.location.href,
        i = action.indexOf('?a=');

    //调用Drawing的init方法，创建canvas对象，动态设置宽高
    S.Drawing.init('.canvas'); 
    //给body增加一个类名
    document.body.classList.add('body--ready');

    if (i !== -1) {
      S.UI.simulate(decodeURI(action).substring(i + 3));
    } else {
      //第一次进来时，没有传参a，i为-1，调用UI的simulate方法
      //这里所有的目的都是为了得到像素点对象集合
      S.UI.simulate('←_←|yllg|countdown|#countdown|rectangle|#rectangle|circle|#circle|time|#time|#countdown 3|中文|');
    }
    //将函数传给loop方法
    S.Drawing.loop(function () {
      //循环方法里面调用这个方法，最后748行的render方法了
      //这个render里面for循环调用每个像素点自己的render方法
      //执行一个499行_update方法和_draw方法
      //然后这个方法一直在loop中循环了
      //显示完第一个字符，跳出循环，再去判断第二个字符，得到像素点，再循环；依次列推
      S.Shape.render();
    });
  }
};


S.Drawing = (function () {
  var canvas,
      context,
      renderFn
      requestFrame = window.requestAnimationFrame       ||
                     window.webkitRequestAnimationFrame ||
                     window.mozRequestAnimationFrame    ||
                     window.oRequestAnimationFrame      ||
                     window.msRequestAnimationFrame     ||
                     function(callback) {
                       window.setTimeout(callback, 1000 / 60);
                     };

  return {
    //把init方法暴露出去给外部调用，该方法创建canvas对象，并动态设置宽高
    init: function (el) {
      canvas = document.querySelector(el);
      context = canvas.getContext('2d');
      // 调整canvas的宽和高
      this.adjustCanvas();
      //监听window窗体大小的变化，动态设置canvas的大小
      window.addEventListener('resize', function (e) {
        S.Drawing.adjustCanvas();
      });
    },

    loop: function (fn) {
      renderFn = !renderFn ? fn : renderFn;
      //清空画布
      this.clearFrame();
      //执行传进来的函数，即23行的函数参数
      renderFn();
      requestFrame.call(window, this.loop.bind(this));
    },

    adjustCanvas: function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },

    clearFrame: function () {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },

    getArea: function () {
      return { w: canvas.width, h: canvas.height };
    },

    drawCircle: function (p, c) {
      context.fillStyle = c.render();
      context.beginPath();
      context.arc(p.x, p.y, p.z, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();  //真正的小圆点都是在这里画的啊！
    }
  }
}());


S.UI = (function () {
  var input = document.querySelector('.ui-input'),
      ui = document.querySelector('.ui'),
      help = document.querySelector('.help'),
      commands = document.querySelector('.commands'),
      overlay = document.querySelector('.overlay'),
      canvas = document.querySelector('.canvas'),
      interval,
      isTouch = false, //('ontouchstart' in window || navigator.msMaxTouchPoints),
      currentAction,
      resizeTimer,
      time,
      maxShapeSize = 30,
      firstAction = true,
      sequence = [],
      cmd = '#';

  function formatTime(date) {
    var h = date.getHours(),
        m = date.getMinutes(),
    m = m < 10 ? '0' + m : m;
    return h + ':' + m;
  }

  function getValue(value) {
    return value && value.split(' ')[1];
  }

  function getAction(value) {
    //对第一个字符串进行处理等一系列操作，做个===判断，返回一个布尔值
    value = value && value.split(' ')[0];
    return value && value[0] === cmd && value.substring(1);
  }

 //第一次打开页面，reverse没有传进来，未定义
  function timedAction(fn, delay, max, reverse) {
    //清除定时器
    clearInterval(interval);
    //reverse未定义，所以currentAction取1，定义了就取max
    currentAction = reverse ? max : 1;
    //然后调用传进来的第一个参数fn函数
    fn(currentAction);

    if (!max || (!reverse && currentAction < max) || (reverse && currentAction > 0)) {
      //整个在定时器里
      interval = setInterval(function () {
        currentAction = reverse ? currentAction - 1 : currentAction + 1;
        //调用传进来的第一个参数fn函数
        fn(currentAction);
        if ((!reverse && max && currentAction === max) || (reverse && currentAction === 0)) {
          clearInterval(interval);
        }
      }, delay);
    }
  }

  function reset(destroy) {
    clearInterval(interval);
    sequence = [];
    time = null;
    destroy && S.Shape.switchShape(S.ShapeBuilder.letter(''));
  }

  //通过暴露一个simulate方法，调用本方法，value是传进来的字符串或者数组对象
  function performAction(value) {
    var action,
        value,
        current;
    //把弹窗设置不可见
    overlay.classList.remove('overlay--visible');
    //传进来的是数组对象就取本身，否则字符串拆成数组
    sequence = typeof(value) === 'object' ? value : sequence.concat(value.split('|'));
    //底部输入框清空
    input.value = '';
    checkInputWidth();
    //调用到119行的timedAction方法，传参，第一是个函数，第二个是延时的时间，第三个是字符串长度
    timedAction(function (index) {
      //shift函数，把数组的第一个元素删除，并返回出来；也就是取第一个元素
      current = sequence.shift();
      //调用114行的getAction方法
      action = getAction(current);
      //调用110行的getValue方法
      value = getValue(current);

      //第一个字符yllg的action结果为false，进到default里
      switch (action) {
        case 'countdown':
          value = parseInt(value) || 10;
          value = value > 0 ? value : 10;

          timedAction(function (index) {
            if (index === 0) {
              if (sequence.length === 0) {
                S.Shape.switchShape(S.ShapeBuilder.letter(''));
              } else {
                performAction(sequence);
              }
            } else {
              S.Shape.switchShape(S.ShapeBuilder.letter(index), true);
            }
          }, 1000, value, true);
          break;

        case 'rectangle':
          value = value && value.split('x');
          value = (value && value.length === 2) ? value : [maxShapeSize, maxShapeSize / 2];

          S.Shape.switchShape(S.ShapeBuilder.rectangle(Math.min(maxShapeSize, parseInt(value[0])), Math.min(maxShapeSize, parseInt(value[1]))));
          break;

        case 'circle':
          value = parseInt(value) || maxShapeSize;
          value = Math.min(value, maxShapeSize);
          S.Shape.switchShape(S.ShapeBuilder.circle(value));
          break;

        case 'time':
          var t = formatTime(new Date());

          if (sequence.length > 0) {
            S.Shape.switchShape(S.ShapeBuilder.letter(t));
          } else {
            timedAction(function () {
              t = formatTime(new Date());
              if (t !== time) {
                time = t;
                S.Shape.switchShape(S.ShapeBuilder.letter(time));
              }
            }, 1000);
          }
          break;

        default:
        //先进入590行的letter方法，参数字符如果等于#，返回what？ 否则取本身传值
        //将letter函数返回的结果作为参数，调用switchShape方法哦
          S.Shape.switchShape(S.ShapeBuilder.letter(current[0] === cmd ? 'What?' : current));
      }
    }, 2000, sequence.length);
  }

  function checkInputWidth(e) {
     //根据输入框是否有内容，给它添加个类名
    if (input.value.length > 18) {
      ui.classList.add('ui--wide');
    } else {
      ui.classList.remove('ui--wide');
    }
    //这个函数S.UI初始化时，firstAction设置为true了
    //又根据输入框内容，增加或者移除类名
    if (firstAction && input.value.length > 0) {
      ui.classList.add('ui--enter');
    } else {
      ui.classList.remove('ui--enter');
    }
  }

  function bindEvents() {
    document.body.addEventListener('keydown', function (e) {
      input.focus();

      if (e.keyCode === 13) {
        firstAction = false;
        reset();
        performAction(input.value);
      }
    });

    input.addEventListener('input', checkInputWidth);
    input.addEventListener('change', checkInputWidth);
    input.addEventListener('focus', checkInputWidth);

    help.addEventListener('click', function (e) {
      overlay.classList.toggle('overlay--visible');
      overlay.classList.contains('overlay--visible') && reset(true);
    });

    commands.addEventListener('click', function (e) {
      var el,
          info,
          demo,
          tab,
          active,
          url;

      if (e.target.classList.contains('commands-item')) {
        el = e.target;
      } else {
        el = e.target.parentNode.classList.contains('commands-item') ? e.target.parentNode : e.target.parentNode.parentNode;
      }

      info = el && el.querySelector('.commands-item-info');
      demo = el && info.getAttribute('data-demo');
      url = el && info.getAttribute('data-url');

      if (info) {
        overlay.classList.remove('overlay--visible');

        if (demo) {
          input.value = demo;

          if (isTouch) {
            reset();
            performAction(input.value);
          } else {
            input.focus();
          }
        } else if (url) {
          //window.location = url;
        }
      }
    });

    canvas.addEventListener('click', function (e) {
      overlay.classList.remove('overlay--visible');
    });
  }

  function init() {
    bindEvents();
    input.focus();
    isTouch && document.body.classList.add('touch');
  }

  // Init
  init();

  return {
    //页面初始化调用了这个方法，传了些字符串进来
    simulate: function (action) {
      //调用自己内部的私有函数。饶了好久，执行完了，返回19行
      performAction(action);
    }
  }
}());


S.UI.Tabs = (function () {
  var tabs = document.querySelector('.tabs'),
      labels = document.querySelector('.tabs-labels'),
      triggers = document.querySelectorAll('.tabs-label'),
      panels = document.querySelectorAll('.tabs-panel');

  function activate(i) {
    triggers[i].classList.add('tabs-label--active');
    panels[i].classList.add('tabs-panel--active');
  }

  function bindEvents() {
    labels.addEventListener('click', function (e) {
      var el = e.target,
          index;

      if (el.classList.contains('tabs-label')) {
        for (var t = 0; t < triggers.length; t++) {
          triggers[t].classList.remove('tabs-label--active');
          panels[t].classList.remove('tabs-panel--active');

          if (el === triggers[t]) {
            index = t;
          }
        }

        activate(index);
      }
    });
  }

  function init() {
    activate(0);
    bindEvents();
  }

  // Init
  init();
}());


S.Point = function (args) {
  this.x = args.x;
  this.y = args.y;
  this.z = args.z;
  this.a = args.a;
  this.h = args.h;
};


S.Color = function (r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
};

S.Color.prototype = {
  render: function () {
    return 'rgba(' + this.r + ',' +  + this.g + ',' + this.b + ',' + this.a + ')';
  }
};


S.Dot = function (x, y) {
  this.p = new S.Point({
    x: x,
    y: y,
    z: 5,
    a: 1,
    h: 0
  });

  this.e = 0.07;
  this.s = true;

  this.c = new S.Color(255, 255, 255, this.p.a);

  this.t = this.clone();
  this.q = [];
};

S.Dot.prototype = {
  clone: function () {
    return new S.Point({
      x: this.x,
      y: this.y,
      z: this.z,
      a: this.a,
      h: this.h
    });
  },

  _draw: function () {
    this.c.a = this.p.a;
    //调用78行画圆的方法，传入p位置和颜色对象rgba
    S.Drawing.drawCircle(this.p, this.c);
  },

  _moveTowards: function (n) {
    var details = this.distanceTo(n, true),
        dx = details[0],
        dy = details[1],
        d = details[2],
        e = this.e * d;

    if (this.p.h === -1) {
      this.p.x = n.x;
      this.p.y = n.y;
      return true;
    }

    if (d > 1) {
      this.p.x -= ((dx / d) * e);
      this.p.y -= ((dy / d) * e);
    } else {
      if (this.p.h > 0) {
        this.p.h--;
      } else {
        return true;
      }
    }

    return false;
  },

  _update: function () {
   //调用_moveTowards方法
    if (this._moveTowards(this.t)) {
      var p = this.q.shift();

      if (p) {
        this.t.x = p.x || this.p.x;
        this.t.y = p.y || this.p.y;
        this.t.z = p.z || this.p.z;
        this.t.a = p.a || this.p.a;
        this.p.h = p.h || 0;
      } else {
        if (this.s) {
          this.p.x -= Math.sin(Math.random() * 3.142);
          this.p.y -= Math.sin(Math.random() * 3.142);
        } else {
          this.move(new S.Point({
            x: this.p.x + (Math.random() * 50) - 25,
            y: this.p.y + (Math.random() * 50) - 25,
          }));
        }
      }
    }
    d = this.p.a - this.t.a;
    this.p.a = Math.max(0.1, this.p.a - (d * 0.05));
    d = this.p.z - this.t.z;
    this.p.z = Math.max(1, this.p.z - (d * 0.05));
  },

  distanceTo: function (n, details) {
    var dx = this.p.x - n.x,
        dy = this.p.y - n.y,
        d = Math.sqrt(dx * dx + dy * dy);

    return details ? [dx, dy, d] : d;
  },

  move: function (p, avoidStatic) {
    if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
      this.q.push(p);
    }
  },

  render: function () {
    //调用自己的_update和_draw方法
    this._update();  //看不懂
    this._draw();  //里面调用78行画圆的方法
  }
}


//形状创建的方法，返回像素点的集合
S.ShapeBuilder = (function () {
  var gap = 13,
      // 专门创建一个canvas上下文对象
      shapeCanvas = document.createElement('canvas'),
      shapeContext = shapeCanvas.getContext('2d'),
      fontSize = 500,
      fontFamily = 'Avenir, Helvetica Neue, Helvetica, Arial, sans-serif';

  function fit() {
    shapeCanvas.width = Math.floor(window.innerWidth / gap) * gap;
    shapeCanvas.height = Math.floor(window.innerHeight / gap) * gap;
    shapeContext.fillStyle = 'red';
    shapeContext.textBaseline = 'middle';
    shapeContext.textAlign = 'center';
  }

  //canvas加工处理的方法
  function processCanvas() {
    //canvas的getImageData方法，得到画布内所有像素的数据，几十万的像素点
    var pixels = shapeContext.getImageData(0, 0, shapeCanvas.width, shapeCanvas.height).data;
        dots = [],
        pixels,
        x = 0,
        y = 0,
        fx = shapeCanvas.width,
        fy = shapeCanvas.height,
        w = 0,
        h = 0;
        //在几十万的像素点中循环，
    for (var p = 0; p < pixels.length; p += (4 * gap)) {
      //像素点有值的时候，往dots数组添加。默认第一次所有的像素点都是空的0
      //也就是循环结束，dots数组还是空的
      if (pixels[p + 3] > 0) {
        //调用Point方法，加到dots数组中
        dots.push(new S.Point({
          x: x,
          y: y
          }));
          w = x > w ? x : w;
          h = y > h ? y : h;
          fx = x < fx ? x : fx;
          fy = y < fy ? y : fy;
      }
      x += gap;
      //x超出画布，重置为0，并设置y和p的值，然后继续循环
      if (x >= shapeCanvas.width) {
        x = 0;
        y += gap;
        p += gap * 4 * shapeCanvas.width;
      }
    }
    return { dots: dots, w: w + fx, h: h + fy };
  }

  function setFontSize(s) {
    shapeContext.font = 'bold ' + s + 'px ' + fontFamily;
  }

  function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function init() {
    fit();
    window.addEventListener('resize', fit);
  }

  // 初始化了shapeCanvas和shapeContext的一些参数
  init();

  return {
    imageFile: function (url, callback) {
      var image = new Image(),
          a = S.Drawing.getArea();

      image.onload = function () {
        shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
        shapeContext.drawImage(this, 0, 0, a.h * 0.6, a.h * 0.6);
        callback(processCanvas());
      };

      image.onerror = function () {
        callback(S.ShapeBuilder.letter('What?'));
      }

      image.src = url;
    },

    circle: function (d) {
      var r = Math.max(0, d) / 2;
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.beginPath();
      shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false);
      shapeContext.fill();
      shapeContext.closePath();

      return processCanvas();
    },

    //第一次传yllg进来
    letter: function (l) {
      var s = 0;
      //ShapeBuilder方法的公共参数fontSize，给shapeCanvas设置字体大小
      setFontSize(fontSize);
      //做了一些列的处理，取到合理的fontSize
      s = Math.min(fontSize,
                  (shapeCanvas.width / shapeContext.measureText(l).width) * 0.8 * fontSize, 
                  (shapeCanvas.height / fontSize) * (isNumber(l) ? 1 : 0.45) * fontSize);
      //再重新设置一遍fontSize
      setFontSize(s);
      // 开始要绘制了，先清空画布
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      //设置填充的文字
      shapeContext.fillText(l, shapeCanvas.width / 2, shapeCanvas.height / 2);
      // 然后返回canvas加工方法processCanvas执行后的结果出去
      return processCanvas();
    },

    rectangle: function (w, h) {
      var dots = [],
          width = gap * w,
          height = gap * h;

      for (var y = 0; y < height; y += gap) {
        for (var x = 0; x < width; x += gap) {
          dots.push(new S.Point({
            x: x,
            y: y,
          }));
        }
      }

      return { dots: dots, w: width, h: height };
    }
  };
}());



//
S.Shape = (function () {
  var dots = [],
      width = 0,
      height = 0,
      cx = 0,
      cy = 0;

  function compensate() {
    var a = S.Drawing.getArea();
    //比较二者的差值
    cx = a.w / 2 - width / 2;
    cy = a.h / 2 - height / 2;
  }

  return {
    shuffleIdle: function () {
      var a = S.Drawing.getArea();

      for (var d = 0; d < dots.length; d++) {
        if (!dots[d].s) {
          dots[d].move({
            x: Math.random() * a.w,
            y: Math.random() * a.h
          });
        }
      }
    },
 
     //上面会调用这个方法
    switchShape: function (n, fast) {
      var size,
      //调用getArea方法，获得canvas的宽和高
      a = S.Drawing.getArea();
      width = n.w;
      height = n.h;
      //执行这个内部的compensate方法，得到二者的差值cx,cy
      compensate();
      // 传进来的像素点集合与这个内部的像素点集合对比，并添加到内部的dots里
      if (n.dots.length > dots.length) {
        size = n.dots.length - dots.length;
        for (var d = 1; d <= size; d++) {
          dots.push(new S.Dot(a.w / 2, a.h / 2));
        }
      }

      var d = 0,
          i = 0;

      while (n.dots.length > 0) {
        //取个随机数
        i = Math.floor(Math.random() * n.dots.length);
        dots[d].e = fast ? 0.25 : (dots[d].s ? 0.14 : 0.11);
        //判断s值是true或者false
        if (dots[d].s) {
          //执行point方法，move方法
          dots[d].move(new S.Point({
            z: Math.random() * 20 + 10,
            a: Math.random(),
            h: 18
          }));
        } else {
          dots[d].move(new S.Point({
            z: Math.random() * 5 + 5,
            h: fast ? 18 : 30
          }));
        }
        //又执行一次point方法和move方法
        dots[d].s = true;
        dots[d].move(new S.Point({
          x: n.dots[i].x + cx,
          y: n.dots[i].y + cy,
          a: 1,
          z: 5,
          h: 0
        }));
        //看不懂那，处理了下，然后d++，继续这个while循环
        n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1));
        d++;
      }
      //跳出循环后，又来个循环。。r然后终于返回到220行了
      for (var i = d; i < dots.length; i++) {
        if (dots[i].s) {
          dots[i].move(new S.Point({
            z: Math.random() * 20 + 10,
            a: Math.random(),
            h: 20
          }));
          //
          dots[i].s = false;
          dots[i].e = 0.04;
          dots[i].move(new S.Point({ 
            x: Math.random() * a.w,
            y: Math.random() * a.h,
            a: 0.3, //.4
            z: Math.random() * 4,
            h: 0
          }));
        }
      }
    },

    render: function () {
      for (var d = 0; d < dots.length; d++) {
        //调用这个像素点的render方法，493行
        dots[d].render();
      }
    }
  }
}());


S.init();
