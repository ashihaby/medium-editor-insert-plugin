/*!
 * medium-editor-insert-plugin v0.1.1 - jQuery insert plugin for MediumEditor
 *
 * Addon Initialization
 *
 * https://github.com/orthes/medium-editor-images-plugin
 *
 * Copyright (c) 2013 Pavel Linkesch (http://linkesch.sk)
 * Released under the MIT license
 */

 (function ($) {
  /*
  * Private storage of registered addons
  */
  var addons = {};

  /**
  * Extend MediumEditor's serialize function to get rid of unnecesarry Medium Editor Insert Plugin stuff
  * @return {object} content Object containing HTML content of each element
  */
  
  checkScrollBar = function () {
    // http://stackoverflow.com/questions/4614072/how-do-i-find-out-whether-the-browser-window-has-a-scrollbar-visible-in-jquery?answertab=active#tab-top
    var heightContent = $(document.body).height();
    var heightWindow = $(window).height();
    return (heightContent >= heightWindow);
  };

  MediumEditor.prototype.serialize = function () {
    var i, j,
    elementid,
    content = {},
    $clone, $inserts, $insert, $insertData, html;
    for (i = 0; i < this.elements.length; i += 1) {
      elementid = (this.elements[i].id !== '') ? this.elements[i].id : 'element-' + i;

      $clone = $(this.elements[i]).clone();
      $inserts = $('.mediumInsert', $clone);
      for (j = 0; j < $inserts.length; j++) {
        $insert = $($inserts[j]);
        $insertData = $('.mediumInsert-placeholder', $insert).children();
        if ($insertData.length === 0) {
          $insert.remove();
        } else {
          $insert.removeAttr('contenteditable');
          $('img[draggable]', $insert).removeAttr('draggable');
          if ($insert.hasClass('small')) {
            $insertData.addClass('small');
          }
          $('.mediumInsert-buttons', $insert).remove();
          $insertData.unwrap();
        }
      }

      html = $clone.html().trim();
      content[elementid] = {
        value: html
      };
    }
    return content;
  };

  /**
  * Extend MediumEditor's deactivate function to call $.fn.mediumInsert.insert.disable function
  * @return {void}
  */

  MediumEditor.prototype.deactivate = function () {
    this.deactivateTextEditor();
    $.fn.mediumInsert.insert.$el.mediumInsert('disable');
  };

  MediumEditor.prototype.deactivateTextEditor = function () {
    var i;
    if (!this.isActive) {
      return false;
    }
    this.isActive = false;
    // debugger;
    if (this.toolbar !== undefined) {
      this.toolbar.style.display = 'none';
    }

    document.documentElement.removeEventListener('mouseup', this.checkSelectionWrapper);

    for (i = 0; i < this.elements.length; i += 1) {
      this.elements[i].removeEventListener('paste',this.pasteWrapper);
      this.elements[i].removeEventListener('keyup', this.checkSelectionWrapper);
      this.elements[i].removeEventListener('blur', this.checkSelectionWrapper);
      this.elements[i].removeAttribute('contentEditable');
    }

  };

  /**
  * Extend MediumEditor's activate function to call $.fn.mediumInsert.insert.enable function
  * @return {void}
  */

  MediumEditor.prototype.activate = function () {
    var i;
    if (this.isActive) {
      return false;
    }

    if (this.toolbar !== undefined) {
      this.toolbar.style.display = 'block';
    }

    this.isActive = true;
    for (i = 0; i < this.elements.length; i += 1) {
      this.elements[i].setAttribute('contentEditable', true);
      this.elements[i].addEventListener('paste',this.pasteWrapper);
      
    }
    this.bindSelect();



    $.fn.mediumInsert.insert.$el.mediumInsert('enable');
  };

  /**
  * Medium Editor Insert Plugin
  * @param {object} options Options for the plugin
  * @param {void}
  */

  $.fn.mediumInsert = function (options) {
    if (typeof options === 'string' && $.fn.mediumInsert.insert[options]) {
      $.fn.mediumInsert.insert[options]();
    } else {
      $.fn.mediumInsert.settings = $.extend($.fn.mediumInsert.settings, options);



      /**
      * Initial plugin loop
      */

      return this.each(function () {

        $('p', this).bind('dragover drop', function (e) {
          e.preventDefault();
          return false;
        });

        $.fn.mediumInsert.insert.init($(this));

        for (var i in $.fn.mediumInsert.settings.addons) {
          var addonOptions = $.fn.mediumInsert.settings.addons[i];
          addonOptions.$el = $.fn.mediumInsert.insert.$el;
          addons[i].init(addonOptions);
        }
      });
    }
  };


  /**
  * Settings
  */
  $.fn.mediumInsert.settings = {
    enabled: true,
    addons: {
      images: {},
      embed: {}
    }
  };

  /**
  * Register new addon
  */
  $.fn.mediumInsert.registerAddon = function(name, addon){
    addons[name] = addon;
  };

  /**
  * Get registered addon
  */
  $.fn.mediumInsert.getAddon = function(name){
    return addons[name];
  };


  /**
  * Addon Initialization
  */

  $.fn.mediumInsert.insert = {

    /**
    * Insert initial function
    * @param {element} el Parent container element
    * @return {void}
    */

    init: function ($el) {
      this.$el = $el;
      this.isFirefox = navigator.userAgent.match(/firefox/i);
      this.setPlaceholders();
      this.setEvents();
    },

    /**
    * Deselect selected text
    * @return {void}
    */

    deselect: function () {
      document.getSelection().removeAllRanges();
    },

    /**
    * Disable the plugin
    * @return {void}
    */

    disable: function () {
      $.fn.mediumInsert.settings.enabled = false;

      $.fn.mediumInsert.insert.$el.find('.mediumInsert-buttons').addClass('hide');
    },

    /**
    * Enable the plugin
    * @return {void}
    */

    enable: function () {
      $.fn.mediumInsert.settings.enabled = true;

      $.fn.mediumInsert.insert.$el.find('.mediumInsert-buttons').removeClass('hide');
    },

    /**
    * Return max id in #mediumInsert-*
    * @return {int} max (Max number, -1 if no placeholders exist)
    */
    getMaxId: function () {
      var max = -1;

      $('div[id^="mediumInsert-"]').each(function () {
        var id = parseInt($(this).attr('id').split('-')[1], 10);
        if (id > max) {
          max = id;
        }
      });

      return max;
    },

    /**
    * Method setting placeholders
    * @return {void}
    */

    setPlaceholders: function () {
      var that = this,
      $el = $.fn.mediumInsert.insert.$el,
      editor = $.fn.mediumInsert.settings.editor,
      buttonLabels = (editor && editor.options) ? editor.options.buttonLabels : '',
      insertBlock = '<ul class="mediumInsert-buttonsOptions medium-editor-toolbar medium-editor-toolbar-active">';

      if (Object.keys($.fn.mediumInsert.settings.addons).length === 0) {
        return false;
      }

      for (var i in $.fn.mediumInsert.settings.addons) {
        insertBlock += '<li>' + addons[i].insertButton(buttonLabels) + '</li>';
      }
      insertBlock += '</ul>';
      insertBlock = '<div class="mediumInsert" contenteditable="false">'+
      '<div class="mediumInsert-buttons">'+
      '<a class="mediumInsert-buttonsShow">+</a>'+
      insertBlock +
      '</div>'+
      '<div class="mediumInsert-placeholder"></div>'+
      '</div>';

      if ($el.is(':empty')) {
        $el.html('<p><br></p>');
      }

      $el.keyup(function () {
        var $lastChild = $el.children(':last'),
        i;
        $('.mediumInsert-placeholder').attr('contenteditable', false);
        
        // Fix #39
        // After deleting all content (ctrl+A and delete) in Firefox, all content is deleted and only <br> appears
        // To force placeholder to appear, set <p><br></p> as content of the $el
        if ($el.html() === '' || $el.html() === '<br>') {
          $el.html('<p><br></p>');
        }

        if ($lastChild.hasClass('mediumInsert') && $lastChild.find('.mediumInsert-placeholder').children().length > 0) {
          $el.append('<p><br></p>');
        }

        // Fix not deleting placeholder in Firefox
        // by removing all empty placeholders
        if (this.isFirefox){
          $('.mediumInsert .mediumInsert-placeholder:empty', $el).each(function () {
            $(this).parent().remove();
          });
        }

        i = that.getMaxId() +1;

        $el.children('p').each(function () {
          if ($(this).next().hasClass('mediumInsert') === false) {
            $(this).after(insertBlock);
            $(this).next('.mediumInsert').attr('id', 'mediumInsert-'+ i);
          }
          i++;
        });


      }).keyup();
    },

    hideMediumInput: function(e) {
      var $inputBoxes = $.fn.mediumInsert.insert.$el.find('.mediumInsert-embed'),
          $mediumInsert_buttonsShow = $('.mediumInsert-buttons a.mediumInsert-buttonsShow'),
          $options = $mediumInsert_buttonsShow.siblings('.mediumInsert-buttonsOptions');

      $inputBoxes.detach();
      if (addons.embed) {
        addons.embed.cancel();
      }

      $.fn.mediumInsert.settings.editor.activate();

      if ($mediumInsert_buttonsShow.hasClass('active')) {
        $mediumInsert_buttonsShow.removeClass('active');
        $options.hide();
      }
    },
    isThereOpenMenus: function ($el) {
      var noInputs = $el.find('.mediumInsert-input').length === 0,
          noOptions = $el.find('.mediumInsert-buttonsOptions:visible').length === 0;
      return (noOptions && noInputs);
    },
    elIsEmpty: function ($el) {
      var innerText = $el.text().replace(/[+]/gi, '').length,
          pCounters = $el.find('p').length;
      return (innerText === 0 && pCounters === 1);
    },
    /**
    * Set events on placeholders
    * @return {void}
    */

    setEvents: function () {
      var that = this,
      $el = $.fn.mediumInsert.insert.$el,
      $mediumInsert_buttonsShow = $('.mediumInsert-buttons a.mediumInsert-buttonsShow'),
      $options = $mediumInsert_buttonsShow.siblings('.mediumInsert-buttonsOptions'),
      $placeholder = $mediumInsert_buttonsShow.parent().siblings('.mediumInsert-placeholder'),
      $ediotrContainer = $.fn.mediumInsert.settings.ediotrContainer;

      $el.on('selectstart', '.mediumInsert', function (e) {
        e.preventDefault();
        return false;
      });

      $el.on('blur', function () {
        var $clone = $(this).clone(),
        cloneHtml;

        $clone.find('.mediumInsert').remove();
        cloneHtml = $clone.html().replace(/^\s+|\s+$/g, '');

        if (cloneHtml === '' || cloneHtml === '<p><br></p>') {
          $(this).addClass('medium-editor-placeholder');
        }
      });

      $(document.body).on ('click', function (e) {
        var $target = $(e.target);
        if ($el.find($target).length === 0) {
          that.hideMediumInput();
        }
      });

      // Fix #29
      // Sometimes in Firefox when you hit enter, <br type="_moz"> appears instead of <p><br></p>
      // If it happens, force to wrap the <br> into a paragraph
      $el.on('keypress', function (e) {
        $mediumInsert_buttonsShow.removeClass('active');  
        $options.hide();      

        if (that.isFirefox) {
          if (e.keyCode === 13) {
            //wrap content text in p to avoid firefox problems
            $el.contents().each((function(_this) {
              return function(index, field) {
                if (field.nodeName === '#text') {
                  document.execCommand('insertHTML', false, "<p>" + field.data + "</p>");
                  return field.remove();
                }
              };
            })(this));
            //Firefox add extra br tag inside p tag
            var latestPTag = $el.find('p').last();
            if (latestPTag.text().length > 0) {
              latestPTag.find('br').remove();
            }
          }
        }
      });

      // Fix #39
      // For some reason Chrome doesn't "select-all", when the last placeholder is visible.
      // So it's needed to hide it when the user "selects all", and show it again when they presses any other key.
      $el.on('keydown', function (e) {
        if(e.keyCode === 8) {
          $('.mediumInsert-placeholder').attr('contenteditable', true);
        }
        // Fix Select-all using (ctrl + a) in chrome
        if (navigator.userAgent.match(/chrome/i)) {
          $el.children().last().removeClass('hide');
          if ( (e.ctrlKey || e.metaKey) && e.which === 65) {
            e.preventDefault();
            if($el.find('p').length !== 0 && $el.find('p').text().trim().length === 0) {
              return false;
            }

            $el.children().last().addClass('hide');
            return document.execCommand('selectAll', false, null);
          }
        }
      });

      $el.on('click', '.mediumInsert-buttons a.mediumInsert-buttonsShow', function (e) {
        e.stopPropagation();
        
        var $options = $(this).siblings('.mediumInsert-buttonsOptions'),
        $placeholder = $(this).parent().siblings('.mediumInsert-placeholder'),
        $inputBoxes = $.fn.mediumInsert.insert.$el.find('.mediumInsert-embed'),
        $activeButtons = $('.mediumInsert-buttons a.mediumInsert-buttonsShow.active');

        if ($activeButtons) {
          $activeButtons.parent().find('ul').hide();
          $activeButtons.removeClass('active');
        }

        if ($(this).hasClass('active')) {
          $(this).removeClass('active');
          $options.hide();

          $('a', $options).show();
        } else {
          $(this).addClass('active');
          $options.show();

          $('a', $options).each(function () {
            var aClass = $(this).attr('class').split('action-')[1],
            plugin = aClass.split('-')[0];
            console.log(aClass);
            if ($('.mediumInsert-'+ plugin, $placeholder).length > 0) {
              $('a:not(.action-'+ aClass +')', $options).hide();
            }
          });
          if ( checkScrollBar() ) {
            $currentMediumInsert = $(e.currentTarget).parent().parent();
            
            if ($currentMediumInsert.offset().top + 100 >= $(window).height()){
              ediotrContainerInnerHeight = $ediotrContainer.scrollTop() + $ediotrContainer.innerHeight();
              if ( ediotrContainerInnerHeight + 100 >= $ediotrContainer[0].scrollHeight) {
                $longWhiteSpace = $('<p><br></p><p><br></p><p><br></p>');
                $currentMediumInsert.after($longWhiteSpace);                
                that.setPlaceholders();
              }
              $ediotrContainer.scrollTop(50 + $ediotrContainer[0].scrollTop);
            }
          }
        }
        if ($inputBoxes.length > 0) {
          $inputBoxes.detach();
          $(this).addClass('active');
          $options.show();  
        }
        that.deselect();
        
        
      });

      $el.on('click', '.medium-editor-action-embed', function (event) { 
        $('.mediumInsert-buttonsOptions').hide();
      });

      // $el.on('mouseleave', '.mediumInsert', function () {
      //   $('a.mediumInsert-buttonsShow', this).removeClass('active');
      //   $('.mediumInsert-buttonsOptions', this).hide();
      // });

      $el.on('click', '.mediumInsert-buttons .mediumInsert-action', function (e) {
        var addon = $(this).data('addon'),
        action = $(this).data('action'),
        $placeholder = $(this).parents('.mediumInsert-buttons').siblings('.mediumInsert-placeholder');

        if (addons[addon] && addons[addon][action]) {
          addons[addon][action](e, $placeholder);
        }

        $(this).parents('.mediumInsert').mouseleave();
      });
      $el.on('click', 'p', function (e) {
        that.hideMediumInput();
        $(e.currentTarget).next().find('.mediumInsert-buttonsShow').addClass('active');
        $options.hide();
        $el.find('.mediumInsert-embed').detach();
      });
      $el.on('click', '.mediumInsert', function (e) {
        that.hideMediumInput();
        $(e.currentTarget).find('.mediumInsert-buttonsShow').addClass('active');
        $options.hide();
        $el.find('.mediumInsert-embed').detach();
      });
      $el.on('mousemove', '.mediumInsert', function (e) {
        if (that.isThereOpenMenus($el)) {  
          that.hideMediumInput();
          $(e.currentTarget).find('.mediumInsert-buttonsShow').addClass('active');
        }
      });
      $el.on('mouseleave', '.mediumInsert', function (e) {
        if (that.isThereOpenMenus($el)) {  
          that.hideMediumInput();
          $(e.currentTarget).find('.mediumInsert-buttonsShow').removeClass('active');
        }
      });
      $el.on('mousemove', 'p', function (e) {
        if (that.isThereOpenMenus($el)) {
          $(e.currentTarget).next().find('.mediumInsert-buttonsShow').addClass('active');
        }
      });
      $el.on('mouseleave', 'p', function (e) {
        if (that.isThereOpenMenus($el)) {
          $(e.currentTarget).next().find('.mediumInsert-buttonsShow').removeClass('active');
        }
      });

      $el.on('mousemove', function (e) {
        if (that.elIsEmpty($el)){
          $el.find('.mediumInsert').first().find('.mediumInsert-buttonsShow').addClass('active');
        } 
      });
      $el.on('mouseleave', function (e) {
        if (that.elIsEmpty($el)){
          that.hideMediumInput();
          $el.find('.mediumInsert').first().find('.mediumInsert-buttonsShow').removeClass('active');
        } 
      });
    }

};

}(jQuery));
