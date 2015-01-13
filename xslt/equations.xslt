<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="eqn">
        <div class="eqn">
            <xsl:attribute name="id"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="eqn/table">
        <div class="table pgwide-1 tablecenter">
            <xsl:attribute name="id"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:variable name="baseFontSize">
                <xsl:choose>
                    <xsl:when test="@fontsize">
                        <xsl:value-of select="@fontsize"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>11.5</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:variable>
            <xsl:variable name="textFontSize">
                <xsl:choose>
                    <xsl:when test="$baseFontSize &lt; 11.5">small</xsl:when>
                    <xsl:when test="$baseFontSize &gt; 11.5">large</xsl:when>
                    <xsl:otherwise>medium</xsl:otherwise>
                </xsl:choose>
            </xsl:variable>
            <xsl:attribute name="style">font-size:<xsl:value-of select="$textFontSize"/>;line-height:<xsl:value-of select="round(@leading * 100 div $baseFontSize)"/>%;</xsl:attribute>
            <xsl:choose>
                <xsl:when test="descendant::tgroup/@align='center'">
                    <div class="tableFullWidth">
                        <div class="tableContainer">
                            <xsl:call-template name="eqnInnerTable"/>
                        </div>
                    </div>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:call-template name="eqnInnerTable"/>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>

    <xsl:template name="eqnInnerTable">
        <table class="frame-none" style="text-align:center;">
            <colgroup>
                <xsl:for-each select="tgroup/colspec">
                    <col>
                        <xsl:attribute name="style">width:<xsl:value-of select="@colwidth"/>;</xsl:attribute>
                    </col>
                </xsl:for-each>
            </colgroup>
            <tbody>
                <xsl:for-each select="tgroup/tbody/row">
                    <tr class=" row">
                        <xsl:if test="@valign">
                            <xsl:attribute name="style">vertical-align:<xsl:value-of select="@valign"/>;</xsl:attribute>
                        </xsl:if>
                        <xsl:for-each select="entry">
                            <td>
                                <xsl:if test="@morerows">
                                    <xsl:attribute name="rowspan"><xsl:value-of select="@morerows + 1"/></xsl:attribute>
                                </xsl:if>
                                <xsl:if test="@rowsep = '1' or not(@rowsep)">
                                    <xsl:attribute name="class">rowsep</xsl:attribute>
                                </xsl:if>
                                <xsl:variable name="align">
                                    <xsl:choose>
                                        <xsl:when test="@align"><xsl:value-of select="@align"/></xsl:when>
                                        <xsl:otherwise>center</xsl:otherwise>
                                    </xsl:choose>
                                </xsl:variable>
                                <xsl:attribute name="style">text-align:<xsl:value-of select="$align"/>;<xsl:if test="@valign">vertical-align:<xsl:value-of select="@valign"/>;</xsl:if></xsl:attribute>
                                <xsl:value-of select="."/>
                            </td>
                        </xsl:for-each>
                    </tr>
                </xsl:for-each>
            </tbody>
        </table>
    </xsl:template>

    <xsl:template match="eqn/para">
        <!-- TODO: Revise this so it has a neater way of playing nice with global text() rule -->
        <xsl:for-each select="text">
            <p class="text"><xsl:value-of select="."/></p>
        </xsl:for-each>
        <xsl:apply-templates select="*[not(text())]"/>
    </xsl:template>

    <xsl:template match="eqn/eqn-line">
        <p class="eqn-line"><xsl:value-of select="."/></p>
    </xsl:template>

</xsl:stylesheet>
