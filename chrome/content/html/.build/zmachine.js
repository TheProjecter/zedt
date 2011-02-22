/*!
 * Parchment Z-Machine UI and Runner
 * Built: BUILDDATE
 *
 * Copyright (c) 2008-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function($){

parchment.lib.ZUI = Object.subClass({
	// Initiate this ZUI
	init: function( library, engine, logfunc )
	{
		var self = this,
		
		widthInChars = ( gIsIphone && $( document.body ).width() <= 480 ) ? 38 : 80;
		
		// Set up the HTML we need
		library.container.html( '<div id="top-window" class="buffered-window"></div><div id="buffered-windows"></div><div id="content" role="log"></div><div id="bottom"></div>' );
		
		// Defaults
		$.extend( self, {
			_size: [widthInChars, 25],
			_console: null,
			_activeWindow: 0,
			_currentCallback: null,
			_foreground: "default",
			_background: "default",
			_reverseVideo: false,
			_lastSeenY: 0,
			_currStyles: ['z-roman'],
			_expectedHash: window.location.hash,
			_isFixedWidth: false,
			_bufferMode: 0,
			
			library: library,
			engine: engine,
			
			hidden_load_indicator: 0,
			
			bottom: $("#bottom"),
			current_input: $("#current-input"),
			text_input: new parchment.lib.TextInput( '#parchment', '#content' ),
			
			_log: logfunc || $.noop,
			
			_windowHashCheck: function()
			{
				if ( window.location.hash != self._expectedHash )
				{
					self._restart();
				}
			}
		});

		self._setFixedPitchSizes();

		$("#top-window").css({width: self._pixelWidth + "px",
		lineHeight: self._pixelLineHeight + "px"});
		$("#content").css({width: self._pixelWidth + "px"});

		self._windowResize();
		self._bindEventHandlers();
		self._eraseBottomWindow();
	},

	    onConsoleRender: function() {
	      var height = $("#top-window").height();
	      $("#content").css({padding: "" + height + "px 0 0 0"});
	    },

	    _finalize: function() {
	    	var self = this;
	      if (self._console) {
	        self._console.close();
	        self._console = null;
	      }
	      //$("#content").empty();
	      self.onPrint("\n[ The game has finished. ]")
	      self._unbindEventHandlers();
	    },

		_bindEventHandlers: function() {
			var self = this;
			$(window).resize(self._windowResize);
			 self._intervalId = window.setInterval(self._windowHashCheck, 1000);
		},

		_unbindEventHandlers: function() {
			var self = this;
			$(window).unbind("resize", self._windowResize);
			window.clearInterval(self._intervalId);
			
			this.text_input.die();
			},

	    _windowResize: function() {
	      var contentLeft = $("#content").offset().left + "px";
	      $(".buffered-window").css({left: contentLeft});
	    },

	    _removeBufferedWindows: function() {
	      var windows = $("#buffered-windows > .buffered-window");
	      windows.fadeOut("slow", function() { windows.remove(); });
        // Hide load indicator
        if ( !this.hidden_load_indicator )
        {
          this.hidden_load_indicator = 1;
          this.library.load_indicator.detach();
        }
	      // A more conservative alternative to the above is:
	      // $("#buffered-windows").empty();
	    },

	    _eraseBottomWindow: function() {
	      $("#content").empty();
	      this._lastSeenY = 0;
	    },

	    _restart: function() {
	      this._finalize();
	      location.reload();
	    },

	    setVersion: function(version) {
	      this._version = version;
	    },

	    getSize: function() {
	      return this._size;
	    },

	    onLineInput: function(callback) {
	    	var self = this;
    	  if ( self.engine.m_version <= 3 ) { // Redraw status line automatically in V1-V3
    	    var oldwin = self._activeWindow;
	        var oldrev = self._reverseVideo;
	        if (!self._console)
	          self.onSplitWindow(1);
	        self._console.moveTo(0,0);
	        self._activeWindow = 1;
	        self._reverseVideo = true;
	        self.onPrint( self.engine.getStatusLine(self._console.width) );
	        self._reverseVideo = oldrev;
	        self._activeWindow = oldwin;
          }
          
          // Hide load indicator
          if ( !self.hidden_load_indicator )
          {
          	self.hidden_load_indicator = 1;
          	self.library.load_indicator.detach();
          }
          
   	      self._currentCallback = callback;
	      /*$("#content").append(
	        '<span id="current-input"><span id="cursor">_</span></span>'
	      );
	      self.current_input = $("#current-input");
	      self.current_input.attr("class", self._calcFinalStyles());*/
	      self.text_input.getLine( callback, self._calcFinalStyles() );
	    },

	    onCharacterInput: function(callback) {
	    	var self = this;
	      self._currentCallback = callback;
	      
	      // Hide load indicator
          if ( !self.hidden_load_indicator )
          {
          	self.hidden_load_indicator = 1;
          	self.library.load_indicator.detach();
          }
          
	      self.text_input.getChar( callback );
	    },

    onSave: function(data, callback) {
      // TODO: Attempt to use other forms of local storage
      // (e.g. Google Gears, HTML 5 database storage, etc) if
      // available; if none are available, we should return false.
      var self = this;
	  self._currentCallback = callback;
      var overwrite = true;

      $("body").append("<div id='zui-save-dialog'><input type='text' maxlength='16' size='16' id='zui-save-name' /></div>");

      var story_url = decodeURIComponent(this.library.url);
      var save_list = window.ff_localStorage.getItem("saves") || {};
      save_list[story_url] = save_list[story_url] || {};

      var all_save_names = [];
      for(var key in save_list[story_url]){
          all_save_names.push(key);
      }

      $( "#zui-save-name" ).autocomplete({
			source: all_save_names
      });

      var saveAndCloseDialog = function($textBox, $closingDialog) {
          var save_name = $.trim($textBox.val());
          if(save_name != '') {
              b64data = file.base64_encode(data);
              save_list[story_url][save_name] = b64data;
              window.ff_localStorage.setItem("saves", save_list);

    		  $closingDialog.dialog("close");
              $closingDialog.remove();
              callback( true );
          }
      };

      $( "#zui-save-name" ).keypress(function(e) {
          if(e.keyCode == 13) {
              saveAndCloseDialog($(this), $('#zui-save-dialog'));
          }
      });

	  $('#zui-save-dialog').dialog({
		  autoOpen: true,
		  width: 250,
          modal: true,
          title: "Save game",
          draggable: false,
          closeOnEscape: false,
          open: function(event, ui) { $(".ui-dialog-titlebar-close").hide(); },
		  buttons: {
			  "Ok": function() { 
                  saveAndCloseDialog($("#zui-save-name"), $(this));
			  }, 
			  "Cancel": function() { 
				  $(this).dialog("close"); 
                  $("#zui-save-dialog").remove();
                  callback( false );
			  } 
		  }
	  });


      // Something very strange happens with local files on windows... perhaps it's because the url has the drive letter?
	  // Anyway, we have to make our own location string
	  //location = location.protocol + '//' + location.host + location.pathname + location.search + '#' + b64data;
      //self._expectedHash = location.hash;
     
			//self.onPrint("Your game has been saved to the URL. You may want " +
			//	"to bookmark this page now; just reload it at any " +
            //       "time to restore your game from this point.\n");
			//callback( true );
		},

onRestore: function(callback)
{
	// TODO: Attempt to use other forms of local storage if
	// available; if none are available, we should return null.

	var b64data = null;
    var story_url = decodeURIComponent(this.library.url);
    var save_list = window.ff_localStorage.getItem("saves") || {};
    save_list[story_url] = save_list[story_url] || {};

    $("body").append("<div id='zui-restore-dialog'><select id='zui-restore-select' multiple='multiple' style='width:100%;'></select></div>");

	var this_game_saves = save_list[story_url];
    for(save_key in this_game_saves) {
        $("#zui-restore-select").append("<option value='" + save_key + "'>" + save_key + "</option>");
    }

    $("#zui-restore-select option").dblclick(function() {
        var save_name = $(this).val();
        var b64data = this_game_saves[save_name];
        callback( file.base64_decode(b64data) );
	    $("#zui-restore-dialog").dialog("close");
        $("#zui-restore-dialog").remove();
    });

	$('#zui-restore-dialog').dialog({
	    autoOpen: true,
		width: 250,
        modal: true,
        title: "Restore game",
        draggable: false,
        closeOnEscape: false,
        open: function(event, ui) { $(".ui-dialog-titlebar-close").hide(); },
		buttons: {
			"Ok": function() {
                var save_name = $("#zui-restore-select").val();
                var b64data = this_game_saves[save_name];
                callback( file.base64_decode(b64data) );
    		    $(this).dialog("close");
                $("#zui-restore-dialog").remove();
			  }, 
			  "Cancel": function() {
                  callback( false );
				  $(this).dialog("close");
                  $("#zui-restore-dialog").remove();
			  } 
		  }
	  });

},

	    onQuit: function() {
	      this._finalize();
	    },

	    onRestart: function() {
			var self = this;
			self._finalize();

			// TODO: It's not high-priority, but according to the Z-Machine
			// spec documentation for the restart opcode, we need to
			// preserve the "transcribing to printer" bit and the "use
			// fixed-pitch font" bit when restarting.

			window.location.hash = "";
			self._restart();
	    },

	    onWimpOut: function(callback) {
	      window.setTimeout(callback, 50);
	    },

	    onFlagsChanged: function(isToTranscript, isFixedWidth) {
	      if (isToTranscript)
	        // TODO: Deal with isToTranscript.
	        throw new FatalError("To transcript not yet implemented!");
	      this._isFixedWidth = isFixedWidth;
	    },

	    onSetStyle: function(textStyle, foreground, background) {
	      switch (textStyle) {
	      case -1:
	        // Don't set the style.
	        break;
	      case 0:
	        this._currStyles = ["z-roman"];
	        this._reverseVideo = false;
	        break;
	      case 1:
	        this._reverseVideo = true;
	        break;
	      case 2:
	        this._currStyles.push("z-bold");
	        break;
	      case 4:
	        this._currStyles.push("z-italic");
	        break;
	      case 8:
	        this._currStyles.push("z-fixed-pitch");
	        break;
	      default:
	        throw new FatalError("Unknown style: " + textStyle);
	      }

	      var colorTable = {0: null,
	                        1: "default",
	                        2: "black",
	                        3: "red",
	                        4: "green",
	                        5: "yellow",
	                        6: "blue",
	                        7: "magenta",
	                        8: "cyan",
	                        9: "white"};

	      if (colorTable[foreground])
	        this._foreground = colorTable[foreground];
	      if (colorTable[background])
	        this._background = colorTable[background];
	    },

	    onSetWindow: function(window) {
	    	var self = this;
	      if (window == 1) {
	        // The following isn't outlined in the Z-Spec, but Fredrik
	        // Ramsberg's "Aventyr" sets the top window shortly after
	        // collapsing its height to 0 (via erasing window -1); so
	        // we'll implicitly create a top window with height 1 now.
	        // See issue 33 for more information:
	        // http://code.google.com/p/parchment/issues/detail?id=33
	        if (!self._console)
	          self.onSplitWindow(1);
	        // From the Z-Spec, section 8.7.2.
	        self._console.moveTo(0, 0);
	      }
	      self._activeWindow = window;
	    },

	    onEraseWindow: function(window) {
	    	var self = this;
	      // Set the background color.
	      document.body.className = "bg-" + self._background;

	      if (window == -2) {
	        self._console.clear();
	        self._eraseBottomWindow();
	      } else if (window == -1) {
	        // From the Z-Spec, section 8.7.3.3.
	        self.onSplitWindow(0);

	        // TODO: Depending on the Z-Machine version, we want
	        // to move the cursor to the bottom-left or top-left.
	        self._eraseBottomWindow();
	      } else if (window == 0) {
	        self._eraseBottomWindow();
	      } else if (window == 1 && self._console) {
	        self._console.clear();
	      }
	    },

	    onSetCursor: function(x, y) {
	    	var self = this;
	      if (self._console)
	        self._console.moveTo(x - 1, y - 1);
	    },

	    onSetBufferMode: function(flag) {
	      // The way that stories use this instruction is odd; it seems to
	      // be set just after a quotation meant to overlay the current
	      // text is displayed, just before a split-window instruction.
	      // Based on this, we'll set a flag, and if it's set when we're
	      // asked to split the window, we'll leave an "imprint" of what
	      // was drawn there until the user presses a key, at which point
	      // it'll fade away.
	      this._bufferMode = flag;
	    },

	    onSplitWindow: function(numlines) {
	    	var self = this;
	      if (numlines == 0) {
	        if (self._console) {
	          self._console.close();
	          self._console = null;
	        }
	      } else {
	        if (!self._console || self._version == 3 ||
	            !self._bufferMode) {
	          self._console = new Console(self._size[0],
	                                      numlines,
	                                      $("#top-window").get(0),
	                                      self);
	        } else if (self._console.height != numlines) {
	          // Z-Machine games are peculiar in regards to the way they
	          // sometimes overlay quotations on top of the current text;
	          // we basically want to preserve any text that is already in
	          // the top window "below" the layer of the top window, so
	          // that anything it doesn't write over remains visible, at
	          // least (and this is an arbitrary decision on our part)
	          // until the user has entered some input.

	          var newDiv = document.createElement("div");
	          newDiv.className = "buffered-window";
	          newDiv.innerHTML = self._console.renderHtml();
	          $(newDiv).css({width: self._pixelWidth + "px",
	                         lineHeight: self._pixelLineHeight + "px"});
	          $("#buffered-windows").append(newDiv);

	          // Pretend the window was just resized, which will position
	          // the new buffered window properly on the x-axis.
	          self._windowResize();

	          self._console.resize(numlines);
	        }
	      }
	      self._bufferMode = 0;
	    },

	    _calcFinalStyles: function() {
	    	var self = this,
	    	fg = self._foreground,
	    	bg = self._background;

	      if (self._reverseVideo) {
	        fg = self._background;
	        bg = self._foreground;
	        if (fg == "default")
	          fg = "default-reversed";
	        if (bg == "default")
	          bg = "default-reversed";
	      }

	      var colors = ["fg-" + fg, "bg-" + bg];

	      // TODO: Also test to see if we don't already have z-fixed-pitch
	      // in self._currStyles, without using Array.indexOf(), which
	      // doesn't seem to be part of MS JScript.
	      if (self._isFixedWidth)
	        colors.push("z-fixed-pitch");

	      return colors.concat(self._currStyles).join(" ");
	    },

	    onPrint: function(output) {
	    	var self = this,
	    	styles = self._calcFinalStyles();

	      self._log("print wind: " + self._activeWindow + " output: " +
	                output.quote() + " style: " + styles);

	      if (self._activeWindow == 0) {
	        var lines = output.split("\n");
	        for (var i = 0; i < lines.length; i++) {

	          if (lines[i]) {
	            var chunk = lines[i].entityify();

	            // TODO: This isn't an ideal solution for having breaking
	            // whitespace while preserving its structure, but it
	            // deals with the most common case.
	            var singleSpace = / /g, singleSpaceBetweenWords = /(\S) (\S)/g, backToSpace = /<&>/g;
	            chunk = chunk.replace(
	              singleSpaceBetweenWords,
	              "$1<&>$2"
	            );
	            chunk = chunk.replace(singleSpace, '&nbsp;');
	            chunk = chunk.replace(
	              backToSpace,
	              "<span class=\"z-breaking-whitespace\"> </span>"
	            );

	            chunk = '<span class="' + styles + '">' + chunk + '</span>';
	            $("#content").append(chunk);
	          }

	          if (i < lines.length - 1)
	            $("#content").append("<br/>");
	        }
	      } else {
	        self._console.write(output, styles);
	      }
	    },

	    onPrintTable: function(lines) {
	      // TODO: Not sure if we should be appending newlines to
	      // these lines or not, or setting the current text style
	      // to monospace if we're displaying in the bottom window.
	      for (var i = 0; i < lines.length; i++)
	        this.onPrint(lines[i]);
	    },

	    _setFixedPitchSizes: function() {
	    	var self = this,
	    	row = document.createElement("div");
	      row.className = "buffered-window";
	      for (var i = 0; i < self._size[0]; i++)
	        row.innerHTML += "O";

	      // We have to wrap the text in a span to get an accurate line
	      // height value, for some reason...
	      row.innerHTML = "<span>" + row.innerHTML + "</span>";

	      $("#buffered-windows").append(row);
	      self._pixelWidth = $(row).width();
	      if(jQuery.browser.msie &&
	         (jQuery.browser.version.length == 1 || jQuery.browser.version.charAt(1)=='.') &&
	         jQuery.browser.version < '7') {
	      	// For MSIE versions < 7, the pixelwidth is set to the entire window width.
	      	// Instead, we estimate the needed width using the font size
	        var fwidth = -1, fsize = document.getElementById('top-window').currentStyle['fontSize'].toLowerCase();
	        if(fsize.substring(fsize.length - 2)=='px')
	          fwidth = 0.6 * parseInt(fsize);
	        else if(fsize.substring(fsize.length - 2)=='pt')
	          fwidth = 0.8 * parseInt(fsize);
	        if(fwidth > 0)
	          self._pixelWidth = self._size[0] * fwidth;
	      }
	      self._pixelLineHeight = $(row.firstChild).height();
	      $("#buffered-windows").empty();
	    }
});

})(jQuery);
/*
 * Quetzal Common Save-File Format
 *
 * Copyright (c) 2008-2010 The Gnusto Contributors
 * Licenced under the GPL v2
 * http://github.com/curiousdannii/gnusto
 */

// A savefile
window.Quetzal = IFF.subClass({
	// Parse a Quetzal savefile, or make a blank one
	init: function(bytes)
	{
		this._super(bytes);
		if (bytes)
		{
			// Check this is a Quetzal savefile
			if (this.type != 'IFZS')
				throw new Error('Not a Quetzal savefile');

			// Go through the chunks and extract the useful ones
			for (var i = 0, l = this.chunks.length; i < l; i++)
			{
				var type = this.chunks[i].type, data = this.chunks[i].data;

				// Memory and stack chunks. Overwrites existing data if more than one of each is present!
				if (type == 'CMem' || type == 'UMem')
				{
					this.memory = data;
					this.compressed = (type == 'CMem');
				}
				else if (type == 'Stks')
					this.stacks = data;

				// Story file data
				else if (type == 'IFhd')
				{
					this.release = data.slice(0, 2);
					this.serial = data.slice(2, 8);
					// The checksum isn't used, but if we throw it away we can't round-trip
					this.checksum = data.slice(8, 10);
					this.pc = data[10] << 16 | data[11] << 8 | data[12];
				}
			}
		}
	},

	// Write out a savefile
	write: function()
	{
		// Reset the IFF type
		this.type = 'IFZS';

		// Format the IFhd chunk correctly
		var pc = this.pc,
		ifhd = this.release.concat(
			this.serial,
			this.checksum,
			(pc >> 16) & 0xFF, (pc >> 8) & 0xFF, pc & 0xFF
		);

		// Add the chunks
		this.chunks = [
			{type: 'IFhd', data: ifhd},
			{type: (this.compressed ? 'CMem' : 'UMem'), data: this.memory},
			{type: 'Stks', data: this.stacks}
		];

		// Return the byte array
		return this._super();
	}
});
/*
function Zui() {
}

Zui.prototype = {
  setVersion: function(version) {
  },

  // Returns a 2-element list containing the width and height of the
  // screen, in characters.  The width may be 255, which means
  // "infinite".

  getSize: function() {
  },
  onLineInput: function(callback) {
  },
  onCharacterInput: function(callback) {
  },
  onSave: function(data) {
  },
  onRestore: function() {
  },
  onQuit: function() {
  },
  onRestart: function() {
  },
  onWimpOut: function(callback) {
  },
  onBreakpoint: function(callback) {
  },
  onFlagsChanged: function(isToTranscript, isFixedWidth) {
  },

  // From the Z-Machine spec for set_text_style: Sets the text style
  // to: Roman (if 0), Reverse Video (if 1), Bold (if 2), Italic (4),
  // Fixed Pitch (8). In some interpreters (though this is not
  // required) a combination of styles is possible (such as reverse
  // video and bold). In these, changing to Roman should turn off all
  // the other styles currently set.

  // From section 8.3.1 of the Z-Spec:
  // -1 =  the colour of the pixel under the cursor (if any)
  // 0  =  the current setting of this colour
  // 1  =  the default setting of this colour
  // 2  =  black   3 = red       4 = green    5 = yellow
  // 6  =  blue    7 = magenta   8 = cyan     9 = white
  // 10 =  darkish grey (MSDOS interpreter number)
  // 10 =  light grey   (Amiga interpreter number)
  // 11 =  medium grey  (ditto)
  // 12 =  dark grey    (ditto)
  // Colours 10, 11, 12 and -1 are available only in Version 6.

  onSetStyle: function(textStyle, foreground, background) {
  },

  // From the Z-Machine spec for split_window: Splits the screen so
  // that the upper window has the given number of lines: or, if
  // this is zero, unsplits the screen again.

  onSplitWindow: function(numLines) {
  },
  onSetWindow: function(window) {
  },

  // From the Z-Machine spec for erase_window: Erases window with
  // given number (to background colour); or if -1 it unsplits the
  // screen and clears the lot; or if -2 it clears the screen
  // without unsplitting it.

  onEraseWindow: function(window) {
  },
  onEraseLine: function() {
  },
  onSetCursor: function(x, y) {
  },

  // From the Z-Machine spec for buffer_mode: If set to 1, text output
  // on the lower window in stream 1 is buffered up so that it can be
  // word-wrapped properly. If set to 0, it isn't.

  onSetBufferMode: function(flag) {
  },
  onSetInputStream: function() {
  },
  onGetCursor: function() {
  },
  onPrint: function(output) {
  },
  onPrintTable: function(lines) {
  }
};
*/

function EngineRunner(engine, zui, logfunc) {
  this._engine = engine;
  this._zui = zui;
  this._isRunning = false;
  this._isInLoop = false;
  this._isWaitingForCallback = false;
  this._log = logfunc;

  var self = this;

  var methods = {
    stop: function() {
      self._isRunning = false;
      self._zui._removeBufferedWindows();
    },

    run: function() {
      var size = self._zui.getSize();
      self._zui.setVersion(self._engine.m_version);

      self._isRunning = true;
      self._engine.m_memory[0x20] = size[1];
      self._engine.m_memory[0x21] = size[0];
      this._engine.setWord(size[0], 0x22); // screen width in 'units'
      this._engine.setWord(size[1], 0x24);
      self._continueRunning();
    },

    _continueRunning: function() {
      while (self._isRunning && !self._isWaitingForCallback) {
        self._loop();
      }
    },

    _receiveLineInput: function(input) {
      self._isWaitingForCallback = false;

      // For now we'll say that a carriage return is the
      // terminating character, because we don't actually support
      // other terminating characters.
      self._engine.answer(0, 13);

      self._engine.answer(1, input);
      self._zui._removeBufferedWindows();
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _receiveCharacterInput: function(input) {
      self._isWaitingForCallback = false;
      self._engine.answer(0, input);
      self._zui._removeBufferedWindows();
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _unWimpOut: function() {
      self._isWaitingForCallback = false;
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _loop: function() {
      if (self._isInLoop)
        throw new FatalError("Already in loop!");

      self._isInLoop = true;
      var engine = self._engine;

      engine.run();

      var text = engine.consoleText();
      if (text)
        self._zui.onPrint(text);

      var effect = '"' + engine.effect(0) + '"';

      var logString = "[ " + engine.effect(0);

      for (var i = 1; engine.effect(i) != undefined; i++) {
        var value = engine.effect(i);
        if (typeof value == "string")
          value = value.quote();
        logString += ", " + value;
      }

      self._log(logString + " ]");

      switch (effect) {
      case GNUSTO_EFFECT_INPUT:
        self._isWaitingForCallback = true;
        self._zui.onLineInput(self._receiveLineInput);
        break;
      case GNUSTO_EFFECT_INPUT_CHAR:
        self._isWaitingForCallback = true;
        self._zui.onCharacterInput(self._receiveCharacterInput);
        break;
      case GNUSTO_EFFECT_SAVE:
        self._isWaitingForCallback = true;
        engine.saveGame();
        self._zui.onSave(engine.saveGameData(), function(success) {
          self._isWaitingForCallback = false;
          if(success) {
            engine.answer(0, 1);
          } else {
            engine.answer(0, 0);
          }
          if (!self._isInLoop) {
            self._continueRunning();
          } else {
            /* We're still inside _loop(), so just return. */
          }
        });
        break;
      case GNUSTO_EFFECT_RESTORE:
        self._isWaitingForCallback = true;
        self._zui.onRestore(function(restoreData) {
          self._isWaitingForCallback = false;
          if (restoreData) {
            engine.loadSavedGame(restoreData);
          } else {
            engine.answer(0, 0);
          }
          if (!self._isInLoop) {
            self._continueRunning();
          } else {
            /* We're still inside _loop(), so just return. */
          }
        });
        break;
      case GNUSTO_EFFECT_QUIT:
        self.stop();
        self._zui.onQuit();
        break;
      case GNUSTO_EFFECT_RESTART:
        self.stop();
        self._zui.onRestart();
        break;
      case GNUSTO_EFFECT_WIMP_OUT:
        self._isWaitingForCallback = true;
        self._zui.onWimpOut(self._unWimpOut);
        break;
      case GNUSTO_EFFECT_BREAKPOINT:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_FLAGS_CHANGED:
        var isToTranscript = engine.m_printing_header_bits & 0x1;
        var isFixedWidth = engine.m_printing_header_bits & 0x2;
        self._zui.onFlagsChanged(isToTranscript, isFixedWidth);
        break;
      case GNUSTO_EFFECT_PIRACY:
				break;
//        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_STYLE:
        self._zui.onSetStyle(engine.effect(1),
                             engine.effect(2),
                             engine.effect(3));
        break;
      case GNUSTO_EFFECT_SOUND:
        // TODO: Actually implement this; for now we'll just
        // ignore it since it's not a required element of 'terps
        // and we don't want the game to crash.
        break;
      case GNUSTO_EFFECT_SPLITWINDOW:
        self._zui.onSplitWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETWINDOW:
        self._zui.onSetWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_ERASEWINDOW:
        self._zui.onEraseWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_ERASELINE:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_SETCURSOR:
        self._zui.onSetCursor(engine.effect(2),
                              engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETBUFFERMODE:
        self._zui.onSetBufferMode(engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETINPUTSTREAM:
      case GNUSTO_EFFECT_GETCURSOR:
        throw new FatalError("Unimplemented effect: " + effect);
        break;
      case GNUSTO_EFFECT_PRINTTABLE:
        var numLines = engine.effect(1);
        // TODO: There's probably a more concise way of doing this
        // by using some built-in array function.
        var lines = [];
        for (i = 0; i < numLines; i++)
          lines.push(engine.effect(2+i));
        self._zui.onPrintTable(lines);
        break;
      }

      self._isInLoop = false;
    }
  };
  for (name in methods)
    self[name] = methods[name];
}
function Console(width, height, element, observer) {
  this.width = width;
  this.height = height;
  this._element = element;
  this._pos = [0, 0];
  this._observer = observer;
  this._isRenderScheduled = false;
  this.clear();
}

Console.prototype = {
  resize: function(height) {
    var linesAdded = height - this.height;

    if (linesAdded == 0)
      return;

    var y;

    if (linesAdded > 0)
      for (y = 0; y < linesAdded; y++)
        this._addRow();
    else
      for (y = 0; y < -linesAdded; y++)
        this._delRow();
    this.height = height;
    this._scheduleRender();
  },

  _delRow: function() {
    this._characters.pop();
    this._styles.pop();
  },

  _addRow: function() {
    var charRow = [];
    var styleRow = [];
    for (var x = 0; x < this.width; x++) {
      charRow.push("&nbsp;");
      styleRow.push(null);
    }
    this._characters.push(charRow);
    this._styles.push(styleRow);
  },

  clear: function() {
    this._characters = [];
    this._styles = [];
    for (var y = 0; y < this.height; y++)
      this._addRow();
    this._scheduleRender();
  },

  moveTo: function(x, y) {
    this._pos = [x, y];
  },

  write: function(string, style) {
    var x = this._pos[0];
    var y = this._pos[1];
    for (var i = 0; i < string.length; i++) {
      var character = null;

      if (string.charAt(i) == " ")
        character = "&nbsp;";
      else if (string.charAt(i) == "\n") {
        x = 0;
        y += 1;
      } else
        character = string.charAt(i).entityify();

      if(y > this.height - 1)
        this.resize(y + 1);
      if (character != null) {
        this._characters[y][x] = character;
        this._styles[y][x] = style;
        x += 1;
      }
    }
    this._pos = [x, y];
    this._scheduleRender();
  },

  _scheduleRender: function() {
    if (!this._isRenderScheduled) {
      this._isRenderScheduled = true;
      var self = this;
      window.setTimeout(function() { self._doRender(); }, 0);
    }
  },

  renderHtml: function() {
    var string = "";
    for (var y = 0; y < this.height; y++) {
      var currStyle = null;
      for (var x = 0; x < this.width; x++) {
        if (this._styles[y][x] !== currStyle) {
          if (currStyle !== null)
            string += "</span>";
          currStyle = this._styles[y][x];
          if (currStyle !== null)
            string += '<span class="' + currStyle + '">';
        }
        string += this._characters[y][x];
      }
      if (currStyle !== null)
        string += "</span>";
      string += "<br/>";
    }
    return string;
  },

  _doRender: function() {
    this._element.innerHTML = this.renderHtml();
    this._isRenderScheduled = false;
    this._observer.onConsoleRender();
  },

  close: function() {
    this._element.innerHTML = "";
    this._observer.onConsoleRender();
  }
};
