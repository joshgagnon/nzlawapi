<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<!-- will eventually do our own rasterization, becauses jpgs suck for diagrams -->

<xsl:template match="figure">
    <div class="figure">
        <xsl:apply-templates/>
    </div>
</xsl:template>


<xsl:template match="graphic">
    <div class="graphic">
        <a target="_blank">
            <xsl:attribute name="alt">
                <xsl:value-of select="@alt-text" />
            </xsl:attribute>
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>

            <xsl:attribute name="href">
                <xsl:variable name="year">
                    <xsl:value-of select="ancestor::*[last()]/@year"/>
                </xsl:variable>
                <xsl:variable name="root-name">
                    <xsl:value-of select="name(ancestor::*[last()])"/>
                </xsl:variable>
                <xsl:variable name="type">
                <xsl:choose>
                    <xsl:when test="$root-name = 'act' ">
                        <xsl:value-of select="ancestor::*[last()]/@act.type"/>
                    </xsl:when>
                    <xsl:when test="$root-name = 'regulation' ">
                        <xsl:value-of select="ancestor::*[last()]/@reg.type"/>
                    </xsl:when>
                    <xsl:when test="$root-name = 'bill' ">
                        <xsl:value-of select="ancestor::*[last()]/@bill.type"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="ancestor::*[last()]/@sop.type"/>
                    </xsl:otherwise>
                </xsl:choose>
                </xsl:variable>
                <xsl:variable name="number">
                <xsl:choose>
                    <xsl:when test="$root-name = 'act' ">
                        <xsl:value-of select="format-number(ancestor::*[last()]/@act.no, '0000')"/>
                    </xsl:when>
                    <xsl:when test="$root-name = 'regulation' ">
                        <xsl:value-of select="format-number(ancestor::*[last()]/@reg.no, '0000')"/>
                    </xsl:when>
                    <xsl:when test="$root-name = 'bill' ">
                        <xsl:value-of select="format-number(ancestor::*[last()]/@bill.no, '0000')"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="format-number(ancestor::*[last()]/@sop.no, '0000')"/>
                    </xsl:otherwise>
                </xsl:choose>
                </xsl:variable>
                <xsl:variable name="version">
                    <xsl:value-of select="ancestor::*[last()]/@version"/>
                </xsl:variable>

                http://www.legislation.govt.nz/<xsl:value-of select="$root-name" />/<xsl:value-of select="$type" />/<xsl:value-of select="$year" />/<xsl:value-of select="$number" />/<xsl:value-of select="$version" />/<xsl:call-template name="string-replace-all">
                                    <xsl:with-param name="text" select="@fileref" />
                        <xsl:with-param name="replace" >.svg</xsl:with-param>
                        <xsl:with-param name="by" >.jpg</xsl:with-param>
                  </xsl:call-template>
            </xsl:attribute>
            Click to Open Image
        </a>
    </div>

</xsl:template>



</xsl:stylesheet>


<!--




            /<xsl:value-of select="$root/@year"/>/
            <xsl:value-of select="$root/@act.no"/>

    <xsl:call-template name="string-replace-all">
            <xsl:with-param name="text" select="@fileref" />
            <xsl:with-param name="replace" select=".svg" />
            <xsl:with-param name="by" select=".jpg" />
          </xsl:call-template>
        </xsl:attribute>
 http://www.legislation.govt.nz/
            >/<xsl:value-of select="$root/@year"/>/
            <xsl:value-of select="$root/@act.no"/>




          -->