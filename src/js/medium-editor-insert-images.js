/*!
 * medium-editor-insert-plugin v0.1.1 - jQuery insert plugin for MediumEditor
 *
 * Images Addon
 *
 * https://github.com/orthes/medium-editor-images-plugin
 *
 * Copyright (c) 2013 Pavel Linkesch (http://linkesch.sk)
 * Released under the MIT license
 */

(function($) {
    $.fn.mediumInsert.registerAddon('images', {

        /**
         * Images initial function
         * @return {void}
         */

        init: function(options) {
            if (options && options.$el) {
                this.$el = options.$el;
            }
            this.options = $.extend(this.default, options);

            this.setImageEvents();
            if (this.options.dragAndDrop) {
                this.setDragAndDropEvents();
            }
            this.preparePreviousImages();
        },


        insertButton: function(buttonLabels) {
            var label = 'Img';
            if (buttonLabels === 'fontawesome') {
                label = '<i class="fa fa-picture-o"></i>';
            }
            return '<button data-addon="images" data-action="add" class="medium-editor-action medium-editor-action-image mediumInsert-action">' + label + '</button>';
        },

        /**
         * Images default options
         */
        default: {
            imagesUploadScript: 'upload.php',
            uploadErrorCallback: $.noop,
            uploadSuccessCallback: $.noop,
            uploadCompleteCallback: $.noop,
            unsupportedFileTypeCallback: $.noop,
            acceptedTypes: {
                'image/png': true,
                'image/jpeg': true,
                'image/gif': true
            },
            dragAndDrop: true,
            formatData: function(file) {
                var formData = new FormData();
                formData.append('file', file);
                return formData;
            }
        },

        /**
         * Make existing images interactive
         */
        preparePreviousImages: function() {
            var that = this;
            this.$el.find('.mediumInsert-images').each(function() {
                var $parent = $(this).parent();
                $parent.html('<div class="mediumInsert-placeholder" draggable="' + that.options.dragAndDrop + '">' + $parent.html() + '</div>');
            });
        },

        /**
         * Add image to placeholder
         * @param {element} $placeholder Placeholder to add image to
         * @return {element} $selectFile <input type="file"> element
         */

        add: function(e, $placeholder) {
            var that = this,
                $selectFile, files;

            $selectFile = $('<input type="file">').click();
            $selectFile.change(function() {
                files = this.files;
                that.uploadFiles($placeholder, files, that);
            });

            $.fn.mediumInsert.insert.deselect();

            return $selectFile;
        },

        /**
         * Update progressbar while upload
         * @param {event} e XMLHttpRequest.upload.onprogress event
         * @return {void}
         */

        updateProgressBar: function(e) {
            var $progress = $('.progress:first', this.$el),
                complete;

            if (e.lengthComputable) {
                complete = (e.loaded / e.total * 100 | 0);
                $progress.attr('value', complete);
                $progress.html(complete);
            }
        },

        /**
         * Show uploaded image after upload completed
         * @param {jqXHR} jqxhr jqXHR object
         * @return {void}
         */

        uploadCompleted: function(jqxhr, $placeholder) {
            var $progress = $('.progress:first', this.$el),
                $img;
            $progress.attr('value', 100);
            $progress.html(100);
            $img = $progress.siblings('.uploading').find('img');
            $progress.remove();
            $img.css('opacity', 1);
            $progress.siblings('.uploading').removeClass('uploading');
            this.options.uploadCompleteCallback(jqxhr);
            $.fn.mediumInsert.insert.$el.keyup();
        },


        /**
         * Lopp though files, check file types and call uploadFile() function on each file that passes
         * @param {element} placeholder Placeholder to add image to
         * @param {FileList} files Files to upload
         * @param {object} that Context
         * @return {void}
         */

        uploadFiles: function($placeholder, files, that) {
            var acceptedTypes = that.options.acceptedTypes,
                xhr = function() {
                    var xhr = new XMLHttpRequest();
                    xhr.upload.onprogress = that.updateProgressBar;
                    return xhr;
                };
            function fileReaderCallback(e) {
                $progress.before('<div class="uploading mediumInsert-images"><img style="opacity: 0.8;" data-attachment="" src="' + e.target.result + '" draggable="true" alt=""></div>');
            }
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                if (acceptedTypes[file.type] === true) {
                    $placeholder.append('<progress style="display:none" class="progress" min="0" max="100" value="0">0</progress>');
                    var $progress = $('.progress:first', this.$el);
                    $progress.parent().parent().after('<p><br/></p>');

                    var fileReader = new FileReader();
                    $(fileReader).on('load', fileReaderCallback);
                    fileReader.readAsDataURL(file);

                    uploadPromise = $.ajax({
                        type: 'post',
                        url: $.fn.mediumInsert.settings.addons.images.imagesUploadScript,
                        xhr: xhr,
                        cache: false,
                        contentType: false,
                        context: this,
                        'complete': function(jqxhr) {
                            that.uploadCompleted(jqxhr, $placeholder);
                        },
                        'success': function(response) {
                            data = this.options.format(response);
                            $img = $progress.siblings('.uploading').find('img');
                            $img.attr('src', data.imageSrc);
                            $img.attr('data-attachment', data.attachmentId);
                            this.setImageEvents();
                            $img.load(function() {
                                $img.parent().mouseleave().mouseenter();
                            });
                            that.options.uploadSuccessCallback(response);
                        },
                        'error': function(jqxhr) {
                            that.options.uploadErrorCallback(jqxhr, $placeholder);
                            $img = $progress.siblings('.uploading').find('img');
                            $img.detach();
                        },
                        processData: false,
                        data: this.options.formatData(file)
                    });
                    that.options.onStartUpload(uploadPromise);
                } else { // not supported file
                    that.options.unsupportedFileTypeCallback();
                }
            }
        },

        /**
         * Set image events displaying remove and resize buttons
         * @return {void}
         */

        setImageEvents: function() {
            this.$el.on('mouseenter', '.mediumInsert-images', function() {
                var $img = $('img', this),
                    positionTop,
                    positionLeft;

                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                if ($img.length > 0) {
                    $(this).append('<a class="mediumInsert-imageRemove"></a>');

                    // if ($(this).parent().parent().hasClass('small')) {
                    //   $(this).append('<a class="mediumInsert-imageResizeBigger"></a>');
                    // } else {
                    //   $(this).append('<a class="mediumInsert-imageResizeSmaller"></a>');
                    // }

                    positionTop = $img.position().top + parseInt($img.css('margin-top'), 10);
                    positionLeft = $img.position().left + $img.width() - 30;
                    $('.mediumInsert-imageRemove', this).css({
                        'right': 'auto',
                        'top': positionTop - 20,
                        'left': positionLeft + 20
                    });
                    // $('.mediumInsert-imageResizeBigger, .mediumInsert-imageResizeSmaller', this).css({
                    //   'right': 'auto',
                    //   'top': positionTop,
                    //   'left': positionLeft-31
                    // });
                }
            });

            this.$el.on('mouseleave', '.mediumInsert-images', function() {
                $('.mediumInsert-imageRemove, .mediumInsert-imageResizeSmaller, .mediumInsert-imageResizeBigger', this).remove();
            });

            this.$el.on('click', '.mediumInsert-imageResizeSmaller', function() {
                $(this).parent().parent().parent().addClass('small');
                $(this).parent().mouseleave().mouseleave();

                $.fn.mediumInsert.insert.deselect();
            });

            this.$el.on('click', '.mediumInsert-imageResizeBigger', function() {
                $(this).parent().parent().parent().removeClass('small');
                $(this).parent().mouseleave().mouseleave();

                $.fn.mediumInsert.insert.deselect();
            });

            this.$el.on('click', '.mediumInsert-imageRemove', function() {
                $.fn.mediumInsert.settings.addons.images.onRemove(this);
                if ($(this).parent().siblings().length === 0) {
                    $(this).parent().parent().parent().removeClass('small');
                }
                $(this).parent().remove();

                $.fn.mediumInsert.insert.deselect();
            });
        },

        /**
         * Set drag and drop evnets
         * @return {void}
         */

        setDragAndDropEvents: function() {
            var that = this,
                dropSuccessful = false,
                dropSort = false,
                dropSortIndex, dropSortParent;

            $(document).on('dragover', 'body', function() {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                $(this).addClass('hover');
            });

            $(document).on('dragend', 'body', function() {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                $(this).removeClass('hover');
            });

            this.$el.on('dragover', '.mediumInsert', function() {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                $(this).addClass('hover');
                $(this).attr('contenteditable', true);
            });

            this.$el.on('dragleave', '.mediumInsert', function() {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                $(this).removeClass('hover');
                $(this).attr('contenteditable', false);
            });

            this.$el.on('dragstart', '.mediumInsert .mediumInsert-images img', function(e) {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                dropSortIndex = $(this).parent().index();
                dropSortParent = $(this).parent().parent().parent().attr('id');
            });

            this.$el.on('dragend', '.mediumInsert .mediumInsert-images img', function(e) {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                if (dropSuccessful === true) {
                    if ($(e.originalEvent.target.parentNode).siblings().length === 0) {
                        $(e.originalEvent.target.parentNode).parent().parent().removeClass('small');
                    }
                    $(e.originalEvent.target.parentNode).mouseleave();
                    $(e.originalEvent.target.parentNode).remove();
                    dropSuccessful = false;
                    dropSort = false;
                }
            });

            this.$el.on('dragover', '.mediumInsert .mediumInsert-images img', function(e) {
                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                e.preventDefault();
            });

            this.$el.on('drop', '.mediumInsert .mediumInsert-images img', function(e) {
                var index, $dragged, finalIndex;

                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }


                if (dropSortParent !== $(this).parent().parent().parent().attr('id')) {
                    dropSort = false;
                    dropSortIndex = dropSortParent = null;
                    return;
                }

                index = parseInt(dropSortIndex, 10);

                // Sort
                $dragged = $(this).parent().parent().find('.mediumInsert-images:nth-child(' + (index + 1) + ')');
                finalIndex = $(this).parent().index();
                if (index < finalIndex) {
                    $dragged.insertAfter($(this).parent());
                } else if (index > finalIndex) {
                    $dragged.insertBefore($(this).parent());
                }

                $dragged.mouseleave();

                dropSort = true;
                dropSortIndex = null;
            });

            this.$el.on('drop', '.mediumInsert', function(e) {
                var files;

                e.preventDefault();

                if ($.fn.mediumInsert.settings.enabled === false) {
                    return;
                }

                $(this).removeClass('hover');
                $('body').removeClass('hover');
                $(this).attr('contenteditable', false);

                files = e.originalEvent.dataTransfer.files;
                if (files.length > 0) {
                    // File upload
                    that.uploadFiles($('.mediumInsert-placeholder', this), files, that);
                } else if (dropSort === true) {
                    dropSort = false;
                } else {
                    // Image move from block to block
                    $('.mediumInsert-placeholder', this).append('<div class="mediumInsert-images">' + e.originalEvent.dataTransfer.getData('text/html') + '</div>');
                    $('meta', this).remove();
                    dropSuccessful = true;
                }
            });
        }
    });
}(jQuery));
